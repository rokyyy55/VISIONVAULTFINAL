"""
VisionVault — Document Intelligence Engine
Production-grade classification & archiving with zero hardcoded logic.
Backend: OpenVINO (Intel CPU) | Cloud (Groq — coming soon)

Key dependency for guaranteed JSON output:
    pip install lm-format-enforcer
"""

import json
import logging
import re
import shutil
import sys
import warnings
warnings.filterwarnings("ignore", category=UserWarning, module="transformers")
from pathlib import Path
from typing import Optional

# ── Logging ────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("visionvault.log", encoding="utf-8"),
    ],
)
log = logging.getLogger("VisionVault")

# ── Config ─────────────────────────────────────────────────────────────────
SUPPORTED_IMAGES: set[str] = {".jpg", ".jpeg", ".png", ".bmp", ".tiff"}
SUPPORTED_DOCS: set[str]   = {".pdf", ".docx", ".xlsx"}
SUPPORTED: set[str]        = SUPPORTED_IMAGES | SUPPORTED_DOCS

DEFAULT_LOCAL_MODEL = r"C:\Users\HANA\PycharmProjects\VisionVault\model_ov"
MAX_IMAGE_WIDTH = 560
CONFIG_FILE = Path(__file__).parent / ".visionvault_config.json"

BANNER = """
╔══════════════════════════════════════════════════════════════╗
║             VisionVault — Document Intelligence              ║
║           Professional Classification & Archiving            ║
╚══════════════════════════════════════════════════════════════╝
"""


# ══════════════════════════════════════════════════════════════════════════
# ── DOCUMENT-TO-PIL CONVERTER ─────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════

def _text_to_pil(text: str):
    """Render extracted text onto a white PIL image so the VLM can read it."""
    from PIL import Image, ImageDraw, ImageFont
    img = Image.new("RGB", (900, 1200), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("arial.ttf", 16)
    except Exception:
        font = ImageFont.load_default()
    y = 20
    for line in text.split("\n"):
        draw.text((20, y), line[:120], fill=(0, 0, 0), font=font)
        y += 22
        if y > 1160:
            break
    return img


def load_file_as_pil(path: Path):
    """
    Convert any supported file to a PIL RGB image.
      Images -> PIL directly
      PDF    -> first page via pdf2image
      DOCX   -> text extracted, rendered to image
      XLSX   -> cell values extracted, rendered to image

    Returns (pil_image, extra_text | None)
    """
    from PIL import Image
    suffix = path.suffix.lower()

    if suffix in SUPPORTED_IMAGES:
        return Image.open(path).convert("RGB"), None

    if suffix == ".pdf":
        try:
            from pdf2image import convert_from_path
        except ImportError:
            raise ImportError(
                "pdf2image not installed. Run:  pip install pdf2image\n"
                "You also need poppler on your PATH."
            )
        pages = convert_from_path(str(path), first_page=1, last_page=1, dpi=150)
        if not pages:
            raise ValueError("pdf2image returned no pages.")
        return pages[0].convert("RGB"), None

    if suffix == ".docx":
        try:
            import docx as python_docx
        except ImportError:
            raise ImportError("python-docx not installed. Run:  pip install python-docx")
        doc = python_docx.Document(str(path))
        lines = [p.text for p in doc.paragraphs if p.text.strip()]
        text = "\n".join(lines)
        return _text_to_pil(text), text

    if suffix == ".xlsx":
        try:
            import openpyxl
        except ImportError:
            raise ImportError("openpyxl not installed. Run:  pip install openpyxl")
        wb = openpyxl.load_workbook(str(path), data_only=True)
        ws = wb.active
        rows = []
        for row in ws.iter_rows(values_only=True):
            row_str = " | ".join(str(c) if c is not None else "" for c in row)
            if row_str.strip(" |"):
                rows.append(row_str)
        text = "\n".join(rows[:60])
        return _text_to_pil(text), text

    raise ValueError(f"Unsupported extension: {suffix}")


# ══════════════════════════════════════════════════════════════════════════
# ── CONFIG, SCHEMA & PROMPT ───────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════

def _ask(prompt: str, default: str = "") -> str:
    """Input helper — ENTER accepts the default."""
    val = input(prompt).strip()
    return val if val else default


def _skip(label: str) -> str:
    """Prompt with explicit skip hint — returns empty string if skipped."""
    return input(f"{label} [ENTER to skip]: ").strip()


def collect_config() -> dict:
    """
    Interactive config with skip on every question.

    Flow:
      1. Classify by what field?          [ENTER = document_type]
      2. Do you know the possible values?
           y -> enum path  : list them, enforcer locks output to exact strings
           n -> free path  : ask if results should be fuzzy-grouped after classification
         (ENTER = skip = free-text, no grouping)
      3. Extra fields to extract?         [ENTER to skip]
      4. Industry context?                [ENTER = General]

    Returns cfg dict:
      {
        "industry":        str,
        "classify_by":     str,
        "allowed_values":  list[str] | None,
        "group_similar":   bool,
        "extra_fields":    list[str],
      }
    """
    print("\n" + "=" * 60 + "\n  CONFIGURATION\n" + "=" * 60)

    # Step 1: classify by
    print(
        "\nWhat field should documents be classified/sorted by?\n"
        "  Examples: document_type, profession, date, department, language\n"
        "  [ENTER = document_type]"
    )
    classify_by = _ask("Classify by: ", "document_type").lower().replace(" ", "_")

    # Step 2: known values or free-text?
    allowed_values = None
    group_similar = False

    print(
        f"\nDo you know the possible values for \'{classify_by}\'?\n"
        f"  y = I will list them  (enforcer locks output to exact values — most accurate)\n"
        f"  n = Let model decide freely, then group similar ones automatically\n"
        f"  [ENTER to skip = free-text, no grouping]"
    )
    knows = _ask("y / n: ", "").lower()

    if knows == "y":
        print(f"\nEnter possible values for \'{classify_by}\' one per line. ENTER to finish.")
        vals = []
        while True:
            v = input(f"  Value {len(vals) + 1}: ").strip()
            if not v:
                break
            vals.append(v)
        if vals:
            allowed_values = vals
            print(f"  Locked to: {', '.join(vals)} (+ 'Other')")
        else:
            print("  No values entered — falling back to free-text mode.")

    elif knows == "n":
        print(
            f"\nShould similar values be grouped after classification?\n"
            f"  e.g. 'Farm Manager' and 'Farm Supervisor' merged into one folder\n"
            f"  [ENTER to skip = keep all values separate]"
        )
        grp = _ask("Group similar values? (y/n): ", "").lower()
        group_similar = grp == "y"
        if group_similar:
            print("  Grouping enabled — rapidfuzz will merge similar values after classification.")
        else:
            print("  No grouping — each unique extracted value gets its own folder.")

    else:
        print(f"  Skipped — \'{classify_by}\' will be extracted freely, no grouping.")

    # Step 3: extra fields
    print(
        f"\nExtra fields to extract besides \'{classify_by}\'?\n"
        f"  Examples: name, date, email, total_amount, department"
    )
    raw_extra = _skip("Extra fields (comma-separated)")
    extra_fields = []
    if raw_extra:
        extra_fields = [
            re.sub(r"[^\w]", "", x.strip().lower().replace(" ", "_"))
            for x in raw_extra.split(",") if x.strip()
        ]
        extra_fields = [f for f in extra_fields if f != classify_by]

    # Step 4: industry
    print("\nIndustry context helps the model understand your documents.")
    industry = _ask("Industry (e.g. Logistics, Healthcare) [ENTER = General]: ", "General")

    return {
        "industry":       industry,
        "classify_by":    classify_by,
        "allowed_values": allowed_values,
        "group_similar":  group_similar,
        "extra_fields":   extra_fields,
    }


def build_json_schema(cfg: dict) -> dict:
    """
    Build a JSON Schema for lm-format-enforcer.

    The classifying field is:
      - an enum if allowed_values were provided (guarantees exact match)
      - a free string otherwise

    All extra fields are typed as string|null.
    """
    classify_by = cfg["classify_by"]

    # Primary classifying field
    if cfg["allowed_values"]:
        classifier_schema = {
            "type": "string",
            "enum": cfg["allowed_values"] + (
                ["Other"] if "Other" not in cfg["allowed_values"] else []
            ),
        }
    else:
        classifier_schema = {"type": ["string", "null"]}

    properties: dict = {
        classify_by: classifier_schema,
        "entity_name": {"type": ["string", "null"]},
        "date":        {"type": ["string", "null"]},
    }

    for field in cfg["extra_fields"]:
        if field not in properties:
            properties[field] = {"type": ["string", "null"]}

    required = [classify_by, "entity_name", "date"]

    return {
        "type": "object",
        "properties": properties,
        "required": required,
        "additionalProperties": {"type": ["string", "number", "null"]},
    }


def build_prompt(cfg: dict) -> str:
    """
    Build a tight, focused prompt for Qwen2-VL-2B.
    The schema enforcer handles JSON correctness so the prompt only needs
    to tell the model what to extract, not how to format it.
    """
    classify_by = cfg["classify_by"]

    if cfg["allowed_values"]:
        options_str = ", ".join(f'"{v}"' for v in cfg["allowed_values"]) + ', "Other"'
        classifier_instruction = (
            f'  - "{classify_by}": one of {options_str}'
        )
    else:
        classifier_instruction = (
            f'  - "{classify_by}": extract this value directly from the document'
        )

    extra_lines = "".join(
        f'\n  - "{f}": extract from document, or null if not found'
        for f in cfg["extra_fields"]
    )

    return (
        f"You are a {cfg['industry']} document analyst.\n"
        f"Extract information from the document image into a JSON object.\n\n"
        f"Fields to extract:\n"
        f"{classifier_instruction}\n"
        f'  - "entity_name": main person or company name, or null\n'
        f'  - "date": any date visible in the document (YYYY-MM-DD if possible), or null'
        f"{extra_lines}\n\n"
        f"Output ONLY the JSON object. No explanation, no markdown."
    )


# ══════════════════════════════════════════════════════════════════════════
# ── MODEL LOADERS ─────────────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════

def load_openvino_model(model_path: str) -> tuple:
    """Load Qwen2-VL-2B via optimum-intel on CPU."""
    try:
        from optimum.intel import OVModelForVisualCausalLM
        from transformers import AutoProcessor
    except ImportError:
        log.error("Missing optimum-intel. Run:  pip install optimum[openvino] optimum-intel")
        sys.exit(1)

    log.info("Loading OpenVINO model — first run compiles & caches (~60s) ...")
    try:
        processor = AutoProcessor.from_pretrained(
            model_path, trust_remote_code=True, use_fast=True
        )
        model = OVModelForVisualCausalLM.from_pretrained(
            model_path, export=False, trust_remote_code=True,
        )
    except Exception as e:
        log.error("Failed to load model: %s", e)
        sys.exit(1)

    log.info("OpenVINO model ready on CPU.")
    return model, processor, "openvino"


def load_cloud_model() -> tuple:
    """
    Groq cloud backend.
    Returns (groq_client, None, "groq").
    Requires:  pip install groq
    API key:   GROQ_API_KEY in .env or environment variable.
    """
    try:
        from groq import Groq
    except ImportError:
        log.error("groq package not installed. Run:  pip install groq")
        sys.exit(1)

    import os
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass  # .env support optional

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        api_key = input("Groq API key (or set GROQ_API_KEY in .env): ").strip()
    if not api_key:
        log.error("No Groq API key provided. Exiting.")
        sys.exit(1)

    client = Groq(api_key=api_key)
    log.info("Groq cloud backend ready (llama-4-scout-17b-16e-instruct).")
    return client, None, "groq"


# ══════════════════════════════════════════════════════════════════════════
# ── INFERENCE ─────────────────────────────────════════════════════════════
# ══════════════════════════════════════════════════════════════════════════

def _check_lm_format_enforcer() -> bool:
    try:
        import lmformatenforcer  # noqa: F401
        return True
    except ImportError:
        return False


def _resize(pil_image, max_width: int = MAX_IMAGE_WIDTH):
    if pil_image.width > max_width:
        new_h = int(pil_image.height * (max_width / pil_image.width))
        return pil_image.resize((max_width, new_h))
    return pil_image


def _pil_to_base64(pil_image) -> str:
    """Convert a PIL image to a base64-encoded JPEG string for Groq API."""
    import base64, io
    buf = io.BytesIO()
    pil_image.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def _build_inputs(pil_image, prompt: str, processor) -> dict:
    msg = [{"role": "user", "content": [
        {"type": "image", "image": pil_image},
        {"type": "text",  "text": prompt},
    ]}]
    text_input = processor.apply_chat_template(
        msg, tokenize=False, add_generation_prompt=True
    )
    return processor(
        text=[text_input], images=[pil_image],
        padding=True, return_tensors="pt",
    )


def _run_constrained(inputs, model, processor, schema: dict, max_new_tokens: int) -> str:
    from lmformatenforcer import JsonSchemaParser
    from lmformatenforcer.integrations.transformers import (
        build_transformers_prefix_allowed_tokens_fn,
    )
    parser = JsonSchemaParser(schema)
    prefix_fn = build_transformers_prefix_allowed_tokens_fn(processor.tokenizer, parser)

    out = model.generate(
        **inputs,
        max_new_tokens=max_new_tokens,
        do_sample=False,
        repetition_penalty=1.1,
        eos_token_id=processor.tokenizer.eos_token_id,
        prefix_allowed_tokens_fn=prefix_fn,
    )
    return processor.batch_decode(
        out[:, inputs["input_ids"].shape[1]:],
        skip_special_tokens=True,
    )[0].strip()


def _run_unconstrained(inputs, model, processor, max_new_tokens: int) -> str:
    out = model.generate(
        **inputs,
        max_new_tokens=max_new_tokens,
        do_sample=False,
        repetition_penalty=1.1,
        eos_token_id=processor.tokenizer.eos_token_id,
    )
    return processor.batch_decode(
        out[:, inputs["input_ids"].shape[1]:],
        skip_special_tokens=True,
    )[0].strip()


def _parse_json(raw: str) -> Optional[dict]:
    raw = re.sub(r"```json|```", "", raw).strip()
    depth, start = 0, None
    for i, ch in enumerate(raw):
        if ch == "{":
            if start is None:
                start = i
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0 and start is not None:
                try:
                    return json.loads(raw[start: i + 1])
                except json.JSONDecodeError:
                    start, depth = None, 0
    return None


def _repair_json(raw: str) -> Optional[dict]:
    result = {}
    for m in re.finditer(
        r'"([\w]+)"\s*:\s*("(?:[^"\\]|\\.)*"|null|true|false|-?\d+(?:\.\d+)?)', raw
    ):
        try:
            result[m.group(1)] = json.loads(m.group(2))
        except json.JSONDecodeError:
            result[m.group(1)] = m.group(2).strip('"')
    return result if result else None


def _fuzzy_match(value: str, valid_values: list[str]) -> str:
    """Match a raw string to the nearest allowed value."""
    try:
        from rapidfuzz import fuzz, process as rf_process
        candidates = valid_values + (["Other"] if "Other" not in valid_values else [])
        match = rf_process.extractOne(value, candidates, scorer=fuzz.token_set_ratio)
        return match[0] if match and match[1] >= 60 else "Other"
    except ImportError:
        value_lower = value.lower()
        for v in valid_values:
            if v.lower() in value_lower or value_lower in v.lower():
                return v
        return "Other"


def _analyze_groq(pil_image, groq_client, prompt: str, cfg: dict) -> dict:
    """
    Send document image to Groq vision model and return parsed dict.
    Uses llama-4-scout-17b-16e-instruct which supports vision + JSON output.
    No lm-format-enforcer needed — Groq supports response_format JSON mode.
    Falls back to regex repair if JSON mode still produces bad output.
    """
    classify_by = cfg["classify_by"]
    allowed     = cfg.get("allowed_values")

    b64 = _pil_to_base64(_resize(pil_image))

    # Build a tight prompt that tells the model exactly what enum to use
    groq_prompt = prompt
    if allowed:
        groq_prompt += (
            f"\n\nCRITICAL: The value of \"{classify_by}\" MUST be one of: "
            + ", ".join(f'"{v}"' for v in allowed)
            + ', or "Other". No other value is acceptable.'
        )
    groq_prompt += "\n\nOutput ONLY a valid JSON object. No markdown, no explanation."

    try:
        response = groq_client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image_url",
                     "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
                    {"type": "text", "text": groq_prompt},
                ],
            }],
            max_tokens=512,
            temperature=0.1,
            response_format={"type": "json_object"},
        )
        raw = response.choices[0].message.content.strip()
    except Exception as e:
        log.error("Groq API error: %s", e)
        return {classify_by: "Other", "inference_error": str(e)}

    parsed = _parse_json(raw) or _repair_json(raw)
    if not parsed:
        log.warning("Groq output unparseable: %s", raw[:200])
        return {classify_by: "Other", "parse_error": True}

    # Fuzzy-match the classify field to allowed values
    if allowed and classify_by in parsed:
        try:
            parsed[classify_by] = _fuzzy_match(str(parsed[classify_by]), allowed)
        except Exception as e:
            log.warning("Fuzzy match failed (%s) — keeping raw value.", e)

    return parsed


def analyze_document(
    pil_image,
    model,
    processor,
    prompt: str,
    schema: dict,
    cfg: dict,
    use_enforcer: bool,
) -> dict:
    """
    Analyze one document image and return structured data.
    The classifying field is fuzzy-matched to allowed_values if provided.
    """
    pil_image = _resize(pil_image)
    inputs = _build_inputs(pil_image, prompt, processor)

    classify_by   = cfg["classify_by"]
    allowed       = cfg.get("allowed_values")

    def _post_process(parsed: dict) -> dict:
        if allowed and classify_by in parsed:
            try:
                parsed[classify_by] = _fuzzy_match(str(parsed[classify_by]), allowed)
            except Exception as e:
                log.warning("Fuzzy match failed (%s) — keeping raw value.", e)
        return parsed

    # ── Constrained path ──────────────────────────────────────────────────
    if use_enforcer:
        try:
            raw = _run_constrained(inputs, model, processor, schema, max_new_tokens=256)
            log.debug("Constrained output: %s", raw)
            parsed = _parse_json(raw)
            if parsed:
                return _post_process(parsed)
            log.warning("Enforcer output unparseable (unexpected): %s", raw[:200])
        except Exception as e:
            log.warning("Enforcer error (%s) — falling back to unconstrained.", e)

    # ── Unconstrained — Pass 1 ────────────────────────────────────────────
    raw = _run_unconstrained(inputs, model, processor, max_new_tokens=256)
    log.debug("Pass 1 raw: %s", raw[:400])
    parsed = _parse_json(raw) or _repair_json(raw)
    if parsed:
        return _post_process(parsed)

    # ── Pass 2: stronger prompt ────────────────────────────────────────────
    log.warning("Pass 1 failed — retrying ...")
    extra = (
        "\n\nIMPORTANT: Output ONLY the JSON object. "
        "Start with { and end with }. "
        "Every string value needs opening AND closing double-quotes. "
        "Separate every key-value pair with a comma."
    )
    inputs2 = _build_inputs(pil_image, prompt + extra, processor)
    raw2 = _run_unconstrained(inputs2, model, processor, max_new_tokens=512)
    log.debug("Pass 2 raw: %s", raw2[:400])
    parsed2 = _parse_json(raw2)
    if parsed2:
        return _post_process(parsed2)

    # ── Pass 3: regex repair ───────────────────────────────────────────────
    log.warning("Pass 2 failed — attempting repair ...")
    repaired = _repair_json(raw2) or _repair_json(raw)
    if repaired:
        log.info("Repair succeeded: %s", repaired)
        return _post_process(repaired)

    log.error("All passes failed. Raw: %s", raw2[:300])
    fallback = "Other" if allowed else "Unknown"
    return {classify_by: fallback, "parse_error": True}


# ══════════════════════════════════════════════════════════════════════════
# ── SMART FILENAME & ORGANIZER ────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════

def _safe(value: str, max_len: int = 50) -> str:
    """Sanitize a value for use as a folder/file name component.
    Returns 'Unknown' for None, null, empty, or meaningless values."""
    s = str(value).strip()
    if s.lower() in ("none", "null", "unknown", "other", "", "n/a", "na", "-"):
        return "Unknown"
    return re.sub(r'[\\/:*?"<>|]', "_", s)[:max_len].strip("_") or "Unknown"



def _normalize_index(index: list[dict], classify_by: str, threshold: int = 80) -> list[dict]:
    """
    Post-classification grouping: merge similar values in classify_by field
    using rapidfuzz so that e.g. 'Farm Manager' and 'Farm Supervisor' land
    in the same folder rather than two separate ones.

    Works by building a canonical list on the fly — the first time a value
    is seen it becomes the canonical form; subsequent values within
    `threshold` similarity are remapped to it.
    """
    try:
        from rapidfuzz import fuzz, process as rf_process
    except ImportError:
        log.warning("rapidfuzz not installed — skipping grouping. Run: pip install rapidfuzz")
        return index

    canonicals: list[str] = []

    for entry in index:
        raw = str(entry["data"].get(classify_by, "") or "").strip()
        if not raw or raw.lower() in ("unknown", "other", "none", "null", ""):
            continue

        if not canonicals:
            canonicals.append(raw)
            continue

        match = rf_process.extractOne(raw, canonicals, scorer=fuzz.token_set_ratio)
        if match and match[1] >= threshold:
            # Remap to the canonical form
            if entry["data"][classify_by] != match[0]:
                log.info("Grouped: '%s' -> '%s' (score %d)", raw, match[0], match[1])
                entry["data"][classify_by] = match[0]
        else:
            canonicals.append(raw)

    return index


def get_smart_name(data: dict, classify_by: str, original: Path) -> str:
    parts = []
    for key in ("entity_name", classify_by, "date"):
        val = data.get(key)
        if val is None:
            continue
        s = str(val).strip()
        if s.lower() in ("none", "null", "unknown", "other", "", "n/a", "na", "-"):
            continue
        safe = _safe(s)
        if safe and safe != "Unknown":
            parts.append(safe)
    stem = "_".join(parts) if parts else original.stem
    return f"{stem}{original.suffix}"


def organize_files(index: list[dict], output_dir: Path, criteria: list[str], classify_by: str) -> None:
    print(f"\nOrganizing by: {' -> '.join(criteria)} ...")
    success, skipped = 0, 0
    for entry in index:
        src = Path(entry["original_path"])
        if not src.exists():
            log.warning("Source missing, skipping: %s", src)
            skipped += 1
            continue

        data = entry["data"]
        path_parts = [_safe(str(data.get(c) or "Unknown")) for c in criteria]
        dest_dir = output_dir.joinpath(*path_parts)
        dest_dir.mkdir(parents=True, exist_ok=True)

        target_name = get_smart_name(data, classify_by, src)
        dest_file = dest_dir / target_name
        counter = 1
        while dest_file.exists():
            dest_file = dest_dir / f"{Path(target_name).stem}_{counter}{src.suffix}"
            counter += 1

        try:
            shutil.copy2(src, dest_file)
            log.info("Archived: %s -> %s", src.name, dest_file.relative_to(output_dir))
            success += 1
        except Exception as e:
            log.error("Could not copy %s: %s", src.name, e)
            skipped += 1

    print(f"Done: {success} archived, {skipped} skipped.")


# ══════════════════════════════════════════════════════════════════════════
# ── PERSISTENT CONFIG ─────────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════

def _load_saved_config() -> dict:
    """Load saved settings from .visionvault_config.json, or return empty dict."""
    try:
        if CONFIG_FILE.exists():
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return {}


def _save_config(data: dict) -> None:
    """Merge and persist settings to .visionvault_config.json."""
    try:
        existing = _load_saved_config()
        existing.update(data)
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(existing, f, indent=2)
    except Exception as e:
        log.warning("Could not save config: %s", e)


# ══════════════════════════════════════════════════════════════════════════
# ── MAIN ──────────════════════════════════════════════════════════════════
# ══════════════════════════════════════════════════════════════════════════

def main() -> None:
    print(BANNER)

    use_enforcer = _check_lm_format_enforcer()
    if use_enforcer:
        log.info("lm-format-enforcer detected — JSON output will be schema-constrained (local only).")
    else:
        log.warning(
            "lm-format-enforcer not found — local JSON output is unconstrained.\n"
            "         For guaranteed valid JSON, run:  pip install lm-format-enforcer"
        )

    saved = _load_saved_config()

    print("Select inference backend:")
    print("  1. Cloud  (Groq — fast, requires API key)")
    print("  2. Local  (OpenVINO — Intel CPU)")
    last_mode = saved.get("backend", "2")
    mode = input(f"Choice [{last_mode}]: ").strip() or last_mode
    _save_config({"backend": mode})

    if mode == "1":
        model, processor, backend = load_cloud_model()
    elif mode == "2":
        saved_path = saved.get("model_path", DEFAULT_LOCAL_MODEL)
        m_path = input(f"Model path [{saved_path}]: ").strip() or saved_path
        if m_path != saved_path:
            _save_config({"model_path": m_path})
        model, processor, backend = load_openvino_model(m_path)
    else:
        log.error("Invalid choice '%s'. Exiting.", mode)
        sys.exit(1)

    # ── New config flow ───────────────────────────────────────────────────
    cfg    = collect_config()
    schema = build_json_schema(cfg)
    prompt = build_prompt(cfg)
    log.debug("Schema: %s", json.dumps(schema, indent=2))
    log.debug("Prompt:\n%s", prompt)

    saved_in  = saved.get("input_dir", "")
    saved_out = saved.get("output_dir", "")
    in_hint   = f" [{saved_in}]" if saved_in else ""
    out_hint  = f" [{saved_out}]" if saved_out else ""
    raw_in    = input(f"\nInput folder{in_hint}: ").strip().strip('"')
    raw_out   = input(f"Output folder{out_hint}: ").strip().strip('"')
    in_dir    = Path(raw_in  or saved_in)
    out_dir   = Path(raw_out or saved_out)
    _save_config({"input_dir": str(in_dir), "output_dir": str(out_dir)})

    if not in_dir.exists() or not in_dir.is_dir():
        log.error("Input path does not exist: %s", in_dir)
        sys.exit(1)

    out_dir.mkdir(parents=True, exist_ok=True)

    files = [f for f in in_dir.rglob("*") if f.suffix.lower() in SUPPORTED]
    if not files:
        print(f"No supported files found in: {in_dir}")
        print(f"Supported: {', '.join(sorted(SUPPORTED))}")
        sys.exit(0)

    print(f"\nFound {len(files)} document(s). Starting classification ...\n")

    index: list[dict] = []
    success_count = 0
    fail_count = 0

    for i, f in enumerate(files, 1):
        print(f"[{i:>3}/{len(files)}] {f.name}")

        try:
            pil_img, extra_text = load_file_as_pil(f)
        except Exception as e:
            log.warning("Cannot open %s: %s", f.name, e)
            fail_count += 1
            index.append({
                "original_path": str(f.resolve()),
                "data": {cfg["classify_by"]: "Other", "load_error": str(e)},
            })
            continue

        effective_prompt = prompt
        if extra_text:
            effective_prompt += f"\n\nExtracted text from document:\n{extra_text[:1000]}"

        try:
            if backend == "groq":
                data = _analyze_groq(pil_img, model, effective_prompt, cfg)
            else:
                data = analyze_document(
                    pil_img, model, processor,
                    effective_prompt, schema, cfg, use_enforcer,
                )
        except Exception as e:
            log.error("Inference error on %s: %s", f.name, e)
            data = {cfg["classify_by"]: "Other", "inference_error": str(e)}
            fail_count += 1
        else:
            if data.get("parse_error") or data.get("inference_error"):
                fail_count += 1
            else:
                success_count += 1

        classify_val = data.get(cfg["classify_by"], "?")
        entity       = data.get("entity_name", "-")
        ok = not any(data.get(k) for k in ("parse_error", "inference_error", "load_error"))
        print(f"         [{'OK' if ok else 'FAIL'}]  {classify_val}  |  {entity}")

        index.append({"original_path": str(f.resolve()), "data": data})

    # ── Summary ────────────────────────────────────────────────────────────
    print("\n" + "-" * 60)
    print(f"Results: {success_count} classified  |  {fail_count} failed  |  {len(files)} total")
    print("-" * 60)

    if not index:
        print("Nothing to organize. Exiting.")
        sys.exit(0)

    # ── Organize ───────────────────────────────────────────────────────────
    # Default sort is always by the field they chose to classify by.
    # Offer to add secondary sort criteria from extracted fields.
    all_fields = sorted(set().union(*[e["data"].keys() for e in index]))
    sortable   = [f for f in all_fields if f not in ("parse_error", "inference_error", "load_error")]

    print(f"\nExtracted fields available for sorting: {', '.join(sortable)}")
    print(f"Primary sort is '{cfg['classify_by']}'. Add secondary criteria?")
    raw_secondary = input("Secondary sort fields (comma-separated, or ENTER to skip): ").strip()

    secondary = []
    if raw_secondary:
        secondary = [
            c.strip() for c in raw_secondary.split(",")
            if c.strip() and c.strip() != cfg["classify_by"]
        ]

    # Optional: group similar free-text values before organizing
    if cfg.get("group_similar"):
        print("\nGrouping similar values ...")
        index = _normalize_index(index, cfg["classify_by"])

    criteria = [cfg["classify_by"]] + secondary
    organize_files(index, out_dir, criteria, cfg["classify_by"])

    index_path = out_dir / "index.json"
    with open(index_path, "w", encoding="utf-8") as fp:
        json.dump(index, fp, indent=2, ensure_ascii=False)

    print(f"\nIndex saved to:  {index_path}")
    print(f"Log saved to:    visionvault.log")
    print("\nVisionVault complete.\n")


if __name__ == "__main__":
    main()
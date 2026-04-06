"""
VisionVault — FastAPI Backend Server
Run with: python -m uvicorn server:app --reload --port 8000

v2.5 — Dual-engine fix:
  - LOCAL (OpenVINO / Qwen2): strictly sequential for loop — InferRequest is not thread-safe
  - CLOUD (Groq): asyncio.gather with Semaphore(CLOUD_CONCURRENCY) for real parallelism
  - Unified _process_file using asyncio.nullcontext() for local path
  - All v2.4 features retained
"""

import asyncio
import json
import os
import platform
import re
import subprocess
import uuid
from contextlib import nullcontext
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

from converter import file_to_base64, SUPPORTED
from analyzer import analyze_document
from organizer import get_available_criteria, organize, normalize_index

load_dotenv()

app = FastAPI(title="VisionVault API", version="2.5")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

jobs: dict[str, dict] = {}

# Free tier: 30,000 TPM limit — keep at 1 to avoid bursting over the limit.
# Paid Groq plan: safe to raise to 3-5.
CLOUD_CONCURRENCY = 1

# ── Local model cache (loaded once, reused for all files) ──────────────────────
_local_model_cache: dict[str, tuple] = {}


def _get_local_model(model_path: str) -> tuple:
    """Load and cache the OpenVINO model. Returns (model, processor)."""
    if model_path in _local_model_cache:
        print(f"  [LOCAL] Using cached model: {model_path}")
        return _local_model_cache[model_path]
    try:
        from optimum.intel import OVModelForVisualCausalLM
        from transformers import AutoProcessor
    except ImportError:
        raise RuntimeError(
            "OpenVINO dependencies not installed.\n"
            "Run: pip install optimum[openvino] optimum-intel"
        )
    print(f"  [LOCAL] Loading OpenVINO model from: {model_path} ...")
    processor = AutoProcessor.from_pretrained(model_path, trust_remote_code=True, use_fast=True)
    model = OVModelForVisualCausalLM.from_pretrained(model_path, export=False, trust_remote_code=True)
    _local_model_cache[model_path] = (model, processor)
    print(f"  [LOCAL] Model ready.")
    return model, processor


# ── PIL helpers for local mode ─────────────────────────────────────────────────

def _text_to_pil(text: str):
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


def _file_to_pil(file_path: str):
    """Convert any supported file to a PIL image for local inference."""
    from PIL import Image
    path = Path(file_path)
    suffix = path.suffix.lower()

    if suffix in (".jpg", ".jpeg", ".png", ".bmp", ".tiff"):
        return Image.open(path).convert("RGB"), None

    if suffix == ".pdf":
        from pdf2image import convert_from_path
        pages = convert_from_path(str(path), first_page=1, last_page=1, dpi=150)
        return (pages[0].convert("RGB"), None) if pages else (None, None)

    if suffix == ".docx":
        import docx as python_docx
        doc = python_docx.Document(str(path))
        lines = [p.text for p in doc.paragraphs if p.text.strip()]
        text = "\n".join(lines)
        return _text_to_pil(text), text

    if suffix == ".xlsx":
        import openpyxl
        wb = openpyxl.load_workbook(str(path), data_only=True)
        ws = wb.active
        rows = []
        for row in ws.iter_rows(values_only=True):
            row_str = " | ".join(str(c) if c is not None else "" for c in row)
            if row_str.strip(" |"):
                rows.append(row_str)
        text = "\n".join(rows[:60])
        return _text_to_pil(text), text

    return None, None


def _analyze_local(file_path: str, pil_image, extra_text, cfg: dict, model_path: str) -> dict:
    """Run inference using local OpenVINO model (Qwen2-VL or compatible)."""
    import json as _json
    model, processor = _get_local_model(model_path)

    classify_by    = cfg.get("classify_by", "document_type")
    allowed_values = cfg.get("allowed_values") or []
    extra_fields   = cfg.get("extra_fields") or []
    industry       = cfg.get("industry", "General")

    if allowed_values:
        options_str     = ", ".join(f'"{v}"' for v in allowed_values) + ', "Other"'
        classifier_line = f'  - "{classify_by}": one of {options_str}'
    else:
        classifier_line = f'  - "{classify_by}": extract this value directly from the document'

    extra_lines = "".join(
        f'\n  - "{f}": extract from document, or null if not found'
        for f in extra_fields
    )

    prompt = (
        f"You are a {industry} document analyst.\n"
        f"Extract information from the document image into a JSON object.\n\n"
        f"Fields to extract:\n"
        f"{classifier_line}\n"
        f'  - "entity_name": main person or company name, or null\n'
        f'  - "date": any date visible (YYYY-MM-DD if possible), or null'
        f"{extra_lines}\n\n"
        f"Output ONLY the JSON object. No explanation, no markdown."
    )
    if extra_text:
        prompt += f"\n\nExtracted text:\n{extra_text[:1000]}"

    max_width = 560
    if pil_image.width > max_width:
        new_h = int(pil_image.height * (max_width / pil_image.width))
        pil_image = pil_image.resize((max_width, new_h))

    msg = [{"role": "user", "content": [
        {"type": "image", "image": pil_image},
        {"type": "text",  "text": prompt},
    ]}]
    text_input = processor.apply_chat_template(msg, tokenize=False, add_generation_prompt=True)
    inputs = processor(text=[text_input], images=[pil_image], padding=True, return_tensors="pt")

    out = model.generate(
        **inputs, max_new_tokens=256, do_sample=False,
        repetition_penalty=1.1, eos_token_id=processor.tokenizer.eos_token_id,
    )
    raw = processor.batch_decode(
        out[:, inputs["input_ids"].shape[1]:], skip_special_tokens=True
    )[0].strip()

    raw_clean = re.sub(r"```json\s*|```\s*", "", raw).strip()
    try:
        return _json.loads(raw_clean)
    except Exception:
        pass

    depth, start = 0, None
    for i, ch in enumerate(raw_clean):
        if ch == "{":
            if start is None:
                start = i
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0 and start is not None:
                try:
                    return _json.loads(raw_clean[start:i + 1])
                except Exception:
                    start, depth = None, 0

    result = {}
    for m in re.finditer(
        r'"([\w]+)"\s*:\s*("(?:[^"\\]|\\.)*"|null|true|false|-?\d+(?:\.\d+)?)', raw_clean
    ):
        try:
            result[m.group(1)] = _json.loads(m.group(2))
        except Exception:
            result[m.group(1)] = m.group(2).strip('"')
    if result:
        return result

    return {classify_by: "Unknown", "parse_error": True, "raw": raw[:200]}


# ── Request Models ─────────────────────────────────────────────────────────────

class ScanRequest(BaseModel):
    input_path:     str
    output_path:    str
    engine:         str
    api_key:        Optional[str]       = None
    model_path:     Optional[str]       = None
    criteria:       list[str]           = ["document_type"]
    classify_by:    Optional[str]       = "document_type"
    allowed_values: Optional[list[str]] = None
    group_similar:  Optional[bool]      = False
    extra_fields:   Optional[list[str]] = []
    industry:       Optional[str]       = "General"

class OrganizeRequest(BaseModel):
    job_id:      str
    criteria:    list[str]
    output_path: str

class TestConnectionRequest(BaseModel):
    api_key: str

class OpenFolderRequest(BaseModel):
    path: str


# ── Helpers ────────────────────────────────────────────────────────────────────

def scan_folder(input_dir: str) -> list[Path]:
    folder = Path(input_dir)
    if not folder.is_dir():
        return []
    return [f for f in folder.rglob("*") if f.is_file() and f.suffix.lower() in SUPPORTED]


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok", "version": "2.5"}


@app.post("/api/test-connection")
async def test_connection(body: TestConnectionRequest):
    try:
        from groq import Groq
        client = Groq(api_key=body.api_key)
        client.chat.completions.create(
            model="llama3-8b-8192",
            messages=[{"role": "user", "content": "ping"}],
            max_tokens=1,
        )
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/open-folder")
def open_folder(body: OpenFolderRequest):
    path = Path(body.path.strip().strip('"'))
    if not path.exists():
        raise HTTPException(status_code=400, detail=f"Path does not exist: {path}")
    try:
        system = platform.system()
        if system == "Windows":
            subprocess.Popen(f'explorer "{path}"')
        elif system == "Darwin":
            subprocess.Popen(["open", str(path)])
        else:
            subprocess.Popen(["xdg-open", str(path)])
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/scan/start")
async def start_scan(body: ScanRequest):
    input_path  = body.input_path.strip().strip('"')
    output_path = body.output_path.strip().strip('"')

    if not Path(input_path).is_dir():
        raise HTTPException(status_code=400, detail=f"Input folder not found: {input_path}")

    files = scan_folder(input_path)
    if not files:
        raise HTTPException(status_code=400, detail="No supported files found in input folder.")

    engine     = body.engine or "cloud"
    api_key    = body.api_key or os.getenv("GROQ_API_KEY", "")
    model_path = (body.model_path or "").strip() or os.getenv(
        "VV_MODEL_PATH",
        r"C:\Users\HANA\PycharmProjects\VisionVault\model_ov"
    )

    classify_by = body.classify_by or "document_type"
    cfg = {
        "classify_by":    classify_by,
        "allowed_values": body.allowed_values,
        "group_similar":  body.group_similar or False,
        "extra_fields":   body.extra_fields or [],
        "industry":       body.industry or "General",
    }

    # Pre-load local model before scan starts so errors surface immediately
    if engine == "local":
        try:
            await asyncio.to_thread(_get_local_model, model_path)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to load local model: {e}")

    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "status":      "running",
        "total":       len(files),
        "processed":   0,
        "success":     0,
        "errors":      0,
        "current":     "",
        "index":       [],
        "input_path":  input_path,
        "output_path": output_path,
        "criteria":    body.criteria,
        "classify_by": classify_by,
        "engine":      engine,
        "model_path":  model_path,
        "api_key":     api_key,
        "cfg":         cfg,
    }

    asyncio.create_task(
        _run_scan(job_id, files, output_path, engine, api_key, model_path, body.criteria, cfg)
    )
    return {"job_id": job_id, "total": len(files)}


# ── Per-file worker ────────────────────────────────────────────────────────────

async def _process_file(
    file_path: Path,
    engine: str,
    api_key: str,
    model_path: str,
    cfg: dict,
    job: dict,
    index: list,
    index_path: Path,
    already: set,
    semaphore: asyncio.Semaphore | None = None,
):
    """
    Process a single file.

    - Local engine:  semaphore=None  → nullcontext (no concurrency at all)
    - Cloud engine:  semaphore=Semaphore(N) → limits concurrent Groq requests
    """
    str_path    = str(file_path.resolve())
    classify_by = cfg.get("classify_by", "document_type")

    # Skip already-indexed files
    if str_path in already:
        job["processed"] += 1
        job["success"]   += 1
        return

    # Use nullcontext for local so the code path stays unified
    ctx = semaphore if semaphore is not None else nullcontext()

    async with ctx:
        job["current"] = file_path.name
        print(f"  [{'LOCAL (OpenVINO/Qwen2)' if engine == 'local' else 'GROQ CLOUD'}] {file_path.name}")

        try:
            if engine == "local":
                # ── Local OpenVINO / Qwen2 path ────────────────────────────
                pil_img, extra_text = await asyncio.to_thread(_file_to_pil, str_path)
                if pil_img is None:
                    raise ValueError("Could not convert file to image")
                data = await asyncio.to_thread(
                    _analyze_local, str_path, pil_img, extra_text, cfg, model_path
                )
            else:
                # ── Groq cloud path ────────────────────────────────────────
                result = await asyncio.to_thread(file_to_base64, str_path)
                if result is None or result == (None, None):
                    raise ValueError("Conversion failed")
                base64_img, extra_text = result
                if base64_img is None:
                    raise ValueError("No image data produced")
                data = await asyncio.to_thread(
                    analyze_document, str_path, base64_img, extra_text, api_key, cfg
                )

            index.append({"original_path": str_path, "filename": file_path.name, "data": data})
            job["success"] += 1
            print(f"    -> {data.get(classify_by, '?')}")

        except Exception as e:
            print(f"  Error: {file_path.name}: {e}")
            job["errors"] += 1
            index.append({
                "original_path": str_path,
                "filename":      file_path.name,
                "data":          {classify_by: "Unknown", "error": str(e)},
            })

        job["processed"] += 1
        job["index"] = index

        with open(index_path, "w", encoding="utf-8") as f:
            json.dump(index, f, indent=2, ensure_ascii=False)

        await asyncio.sleep(0)


# ── Main scan task ─────────────────────────────────────────────────────────────

async def _run_scan(
    job_id: str,
    files: list[Path],
    output_path: str,
    engine: str,
    api_key: str,
    model_path: str,
    criteria: list[str],
    cfg: dict,
):
    job        = jobs[job_id]
    index_path = Path(output_path) / "index.json"
    Path(output_path).mkdir(parents=True, exist_ok=True)

    existing: list[dict] = []
    if index_path.exists():
        try:
            with open(index_path, "r", encoding="utf-8") as f:
                existing = json.load(f)
        except Exception:
            pass

    already = {e["original_path"] for e in existing if "error" not in e.get("data", {})}
    index   = list(existing)

    if engine == "local":
        # ── OpenVINO / Qwen2: one file at a time, no exceptions ───────────
        # asyncio.gather would cause "Infer Request is busy" errors because
        # OVModelForVisualCausalLM's InferRequest is not thread-safe.
        # A plain awaited for-loop is the only correct approach here.
        print(f"\n{'='*50}")
        print(f"  Engine:  LOCAL (OpenVINO / Qwen2)")
        print(f"  Files:   {len(files)}")
        print(f"  Mode:    Sequential — InferRequest is not thread-safe")
        print(f"{'='*50}\n")

        for fp in files:
            await _process_file(
                fp, engine, api_key, model_path, cfg,
                job, index, index_path, already,
                semaphore=None,
            )

    else:
        # ── Groq cloud: real concurrency, rate-limit capped ───────────────
        semaphore = asyncio.Semaphore(CLOUD_CONCURRENCY)

        print(f"\n{'='*50}")
        print(f"  Engine:      CLOUD (Groq)")
        print(f"  Files:       {len(files)}")
        print(f"  Concurrency: {CLOUD_CONCURRENCY}")
        print(f"{'='*50}\n")

        tasks = [
            _process_file(
                fp, engine, api_key, model_path, cfg,
                job, index, index_path, already,
                semaphore=semaphore,
            )
            for fp in files
        ]
        await asyncio.gather(*tasks)

    # ── Post-scan: normalize + organize ───────────────────────────────────
    classify_by = cfg.get("classify_by", "document_type")
    print(f"\nGrouping similar '{classify_by}' values ...")
    index = normalize_index(index, classify_by)
    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(index, f, indent=2, ensure_ascii=False)
    job["index"] = index

    print(f"\nOrganizing {len(index)} files by {criteria} ...")
    try:
        await asyncio.to_thread(organize, index, output_path, criteria)
        print("Organization complete.")
    except Exception as e:
        print(f"  Organization error: {e}")

    job["status"] = "done"


# ── Progress stream ────────────────────────────────────────────────────────────

@app.get("/api/scan/{job_id}/progress")
async def scan_progress(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    async def event_stream():
        while True:
            job = jobs.get(job_id)
            if not job:
                break
            total     = job["total"]
            processed = job["processed"]
            pct       = round((processed / total) * 100) if total else 0
            payload   = json.dumps({
                "status":    job["status"],
                "total":     total,
                "processed": processed,
                "success":   job["success"],
                "errors":    job["errors"],
                "percent":   pct,
                "current":   job["current"],
            })
            yield f"data: {payload}\n\n"
            if job["status"] == "done":
                break
            await asyncio.sleep(0.4)

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.post("/api/organize")
def run_organize(body: OrganizeRequest):
    job = jobs.get(body.job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    index = job.get("index", [])
    if not index:
        index_path = Path(body.output_path) / "index.json"
        if index_path.exists():
            with open(index_path, "r", encoding="utf-8") as f:
                index = json.load(f)
        else:
            raise HTTPException(status_code=400, detail="No index found. Run a scan first.")
    organize(index, body.output_path, body.criteria)
    return {"ok": True, "organized": len(index)}


@app.get("/api/criteria/{job_id}")
def get_criteria(job_id: str):
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"criteria": get_available_criteria(job.get("index", []))}
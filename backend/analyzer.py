"""
VisionVault — Groq Cloud Analyzer
v2.5 — Added retry with backoff for TPM (tokens per minute) rate limits.
       Groq free tier: 30,000 TPM. Retries automatically when hit.
"""

import re
import time


# ── Groq call with retry/backoff ───────────────────────────────────────────────

def _call_groq_with_retry(client, model: str, messages: list, max_retries: int = 6) -> str:
    """
    Call Groq and retry automatically on 429 rate limit errors.
    Reads the exact wait time from the error message and sleeps that long.
    """
    for attempt in range(max_retries):
        try:
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=400,
                temperature=0.0,
            )
            return response.choices[0].message.content.strip()

        except Exception as e:
            err_str = str(e)

            if "429" not in err_str and "rate_limit_exceeded" not in err_str:
                # Not a rate limit error — raise immediately
                raise

            if attempt == max_retries - 1:
                raise RuntimeError(
                    f"Groq rate limit: failed after {max_retries} retries. {err_str[:200]}"
                )

            # Parse wait time from error message
            # Formats: "Xm Y.Zs", "Y.Zs", "Yms"
            wait = 10.0  # fallback

            m = re.search(r'try again in (\d+)m([\d.]+)s', err_str)
            if m:
                wait = int(m.group(1)) * 60 + float(m.group(2))
            else:
                m = re.search(r'try again in ([\d.]+)s', err_str)
                if m:
                    wait = float(m.group(1))
                else:
                    m = re.search(r'try again in ([\d.]+)ms', err_str)
                    if m:
                        wait = float(m.group(1)) / 1000.0

            wait += 1.0  # small buffer so we don't retry too early

            print(
                f"  [GROQ] TPM rate limit. Waiting {wait:.1f}s then retrying "
                f"(attempt {attempt + 1}/{max_retries}) ..."
            )
            time.sleep(wait)

    raise RuntimeError("Groq retry loop exited unexpectedly")


# ── Main analysis function ─────────────────────────────────────────────────────

def analyze_document(
    file_path: str,
    base64_image: str,
    extra_text: str | None,
    api_key: str,
    cfg: dict,
) -> dict:
    """
    Analyze a document using Groq cloud (llama-4-scout vision model).
    Returns a dict with the extracted fields defined in cfg.
    """
    from groq import Groq

    client = Groq(api_key=api_key)
    model  = "meta-llama/llama-4-scout-17b-16e-instruct"

    classify_by    = cfg.get("classify_by", "document_type")
    allowed_values = cfg.get("allowed_values") or []
    extra_fields   = cfg.get("extra_fields") or []
    industry       = cfg.get("industry", "General")

    # Build classifier line
    if allowed_values:
        options_str     = ", ".join(f'"{v}"' for v in allowed_values) + ', "Other"'
        classifier_line = f'  - "{classify_by}": one of [{options_str}]'
    else:
        classifier_line = f'  - "{classify_by}": extract this value from the document'

    # Build extra fields lines
    extra_lines = "".join(
        f'\n  - "{f}": extract from document, or null if not found'
        for f in extra_fields
    )

    prompt = (
        f"You are a {industry} document analyst.\n"
        f"Extract the following fields from the document and return ONLY a JSON object.\n\n"
        f"Fields:\n"
        f"{classifier_line}\n"
        f'  - "entity_name": main person or company name, or null\n'
        f'  - "date": most relevant date in the document (YYYY-MM-DD if possible), or null'
        f"{extra_lines}\n\n"
        f"Rules:\n"
        f"- Output ONLY the JSON object, no explanation, no markdown fences.\n"
        f"- Use null for any field you cannot find."
    )

    # Build message content
    content: list = [
        {
            "type": "image_url",
            "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"},
        },
        {"type": "text", "text": prompt},
    ]

    # Append extracted text if available (helps for docx/xlsx)
    if extra_text:
        content.append({
            "type": "text",
            "text": f"\nExtracted text from document:\n{extra_text[:1500]}",
        })

    messages = [{"role": "user", "content": content}]

    # Call with automatic retry on rate limits
    raw = _call_groq_with_retry(client, model, messages)

    return _parse_json(raw, classify_by)


# ── JSON parser ────────────────────────────────────────────────────────────────

def _parse_json(raw: str, classify_by: str) -> dict:
    """Best-effort JSON extraction from model output."""
    import json as _json

    clean = re.sub(r"```json\s*|```\s*", "", raw).strip()

    try:
        return _json.loads(clean)
    except Exception:
        pass

    depth, start = 0, None
    for i, ch in enumerate(clean):
        if ch == "{":
            if start is None:
                start = i
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0 and start is not None:
                try:
                    return _json.loads(clean[start:i + 1])
                except Exception:
                    start, depth = None, 0

    result = {}
    for m in re.finditer(
        r'"([\w]+)"\s*:\s*("(?:[^"\\]|\\.)*"|null|true|false|-?\d+(?:\.\d+)?)',
        clean,
    ):
        try:
            result[m.group(1)] = _json.loads(m.group(2))
        except Exception:
            result[m.group(1)] = m.group(2).strip('"')

    if result:
        return result

    return {classify_by: "Unknown", "parse_error": True, "raw": raw[:200]}
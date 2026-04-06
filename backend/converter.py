"""
VisionVault — Document-to-Image Converter
Converts any supported document format into a base64 JPEG for vision analysis.
"""

import base64
import os
import tempfile
from pathlib import Path

from PIL import Image

SUPPORTED = [".pdf", ".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".docx", ".xlsx"]


def _text_to_base64(text: str) -> str:
    """
    Render plain text onto a white PIL image and return base64-encoded JPEG.
    Used for DOCX and XLSX content that has no native image representation.
    """
    from PIL import ImageDraw, ImageFont

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

    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        img.save(tmp.name, "JPEG", quality=85)
        tmp_path = tmp.name

    try:
        with open(tmp_path, "rb") as f:
            return base64.b64encode(f.read()).decode("utf-8")
    finally:
        os.unlink(tmp_path)


def file_to_base64(file_path: str) -> tuple[str | None, str | None]:
    """
    Convert a document to a base64 JPEG image suitable for vision analysis.

    Returns:
        (base64_string, extra_text) on success — extra_text is non-None for
        text-based formats (docx, xlsx) so the analyzer can use it as context.
        (None, None) on failure (unsupported format or conversion error).
    """
    path = Path(file_path)
    suffix = path.suffix.lower()

    if suffix not in SUPPORTED:
        print(f"  Unsupported format: {path.name}")
        return None, None

    try:
        # ── Direct image formats ───────────────────────────────────────────
        if suffix in (".jpg", ".jpeg", ".png", ".bmp", ".tiff"):
            with open(path, "rb") as f:
                return base64.b64encode(f.read()).decode("utf-8"), None

        # ── PDF — render first page ────────────────────────────────────────
        if suffix == ".pdf":
            try:
                from pdf2image import convert_from_path
            except ImportError:
                print("  pdf2image is not installed. Run: pip install pdf2image")
                return None, None

            pages = convert_from_path(str(path), first_page=1, last_page=1, dpi=150)
            if not pages:
                print(f"  pdf2image returned no pages for {path.name}")
                return None, None

            with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
                pages[0].save(tmp.name, "JPEG", quality=85)
                tmp_path = tmp.name

            try:
                with open(tmp_path, "rb") as f:
                    return base64.b64encode(f.read()).decode("utf-8"), None
            finally:
                os.unlink(tmp_path)

        # ── Word document — extract text, render to image ──────────────────
        if suffix == ".docx":
            try:
                import docx as python_docx
            except ImportError:
                print("  python-docx is not installed. Run: pip install python-docx")
                return None, None

            doc = python_docx.Document(str(path))
            lines = [p.text for p in doc.paragraphs if p.text.strip()]
            text = "\n".join(lines)
            if not text.strip():
                print(f"  No text found in {path.name}")
                return None, None
            return _text_to_base64(text), text

        # ── Excel spreadsheet — extract cell values, render to image ───────
        if suffix == ".xlsx":
            try:
                import openpyxl
            except ImportError:
                print("  openpyxl is not installed. Run: pip install openpyxl")
                return None, None

            wb = openpyxl.load_workbook(str(path), data_only=True)
            ws = wb.active
            rows = []
            for row in ws.iter_rows(values_only=True):
                row_str = " | ".join(str(c) if c is not None else "" for c in row)
                if row_str.strip(" |"):
                    rows.append(row_str)
            text = "\n".join(rows[:60])
            if not text.strip():
                print(f"  No cell data found in {path.name}")
                return None, None
            return _text_to_base64(text), text

    except Exception as e:
        print(f"  Conversion error for {path.name}: {e}")
        return None, None

    # Should never reach here
    return None, None
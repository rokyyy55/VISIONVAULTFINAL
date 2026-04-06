"""
VisionVault — File Organizer
Copies classified documents into a smart folder hierarchy.
Deduplicates by filename stem: if both 02a5a1f9ff80817d.jpg and
02a5a1f9ff80817d.docx exist, only the preferred format is copied.
Preference order: jpg > png > pdf > docx > xlsx > others.
"""

import re
import shutil
from pathlib import Path

# Fields that are internal / not useful as folder/sort criteria
_SKIP_CRITERIA = {"error", "raw_output", "inference_error", "load_error", "parse_error"}

# Preference order when deduplicating by stem: lower index = higher priority
_FORMAT_PRIORITY = [".jpg", ".jpeg", ".png", ".pdf", ".docx", ".xlsx", ".txt"]

# Keyword groups: if a value contains any of these keywords -> canonical label
_KEYWORD_GROUPS = [
    (["accountant", "accounting", "accounts", "cpa", "bookkeep", "auditor", "audit",
      "finance", "financial", "fiscal", "payroll", "tax", "treasury", "controller",
      "commercial_finance", "commercial finance"], "Accounting_Finance"),
    (["agricultur", "farmer", "farm", "agronomy", "agronomist", "crop", "livestock",
      "horticultur", "soil", "corn", "soybean", "ranch"], "Agriculture"),
    (["engineer", "engineering", "mechanic", "electrical", "civil", "software",
      "hardware", "chemical", "industrial", "structural"], "Engineering"),
    (["doctor", "physician", "nurse", "nursing", "medical", "health", "clinic",
      "surgeon", "surgery", "pharmacist", "dentist", "therapist", "radiolog"], "Healthcare"),
    (["lawyer", "attorney", "legal", "paralegal", "counsel", "notary", "judge"], "Legal"),
    (["hr ", "human resource", "recruiter", "recruiting", "talent", "admin",
      "administrator", "office manager", "secretary", "assistant"], "HR_Admin"),
    (["developer", "programmer", "devops", "data scientist", "data analyst",
      "machine learning", "ai ", "cyber", "network", "system admin", "it "], "IT_Technology"),
    (["sales", "marketing", "brand", "advertis", "customer success",
      "business development", "account executive", "account manager"], "Sales_Marketing"),
    (["teacher", "professor", "lecturer", "tutor", "instructor",
      "education", "school", "academic", "curriculum"], "Education"),
    (["logistics", "supply chain", "warehouse", "driver", "transport",
      "shipping", "freight", "delivery", "dispatcher"], "Logistics"),
]


def sanitize(value: str, max_length: int = 50) -> str:
    """Convert any field value into a safe folder/file name component."""
    value = str(value).strip()

    if value.startswith(("[", "{")):
        match = re.search(r"'([^']{2,40})'", value)
        value = match.group(1) if match else "Unknown"

    value = re.sub(r'[\\/:*?"<>|{}\[\]]', "", value)
    value = re.sub(r"[\s\-,;]+", "_", value)
    value = value.strip("_")[:max_length]

    return value or "Unknown"


def _is_empty(val: str) -> bool:
    return not val or val.lower() in ("none", "null", "unknown", "n/a", "na", "-", "")


def _keyword_group(value: str) -> str | None:
    normalized = value.lower().replace("_", " ").replace("-", " ")
    for keywords, label in _KEYWORD_GROUPS:
        for kw in keywords:
            if kw in normalized:
                return label
    return None


def _format_priority(path: Path) -> int:
    """Lower number = preferred file format."""
    try:
        return _FORMAT_PRIORITY.index(path.suffix.lower())
    except ValueError:
        return len(_FORMAT_PRIORITY)


def get_available_criteria(index: list[dict]) -> list[str]:
    """
    Collect all field keys present across all documents.
    Always puts document_type first; skips internal/error fields.
    """
    found: set[str] = set()
    for entry in index:
        for key in entry.get("data", {}):
            if key not in _SKIP_CRITERIA and key != "document_type":
                found.add(key)
    return ["document_type"] + sorted(found)


def normalize_index(index: list[dict], classify_by: str, threshold: int = 75) -> list[dict]:
    """
    Two-pass grouping:
      Pass 1 — keyword matching: groups known domains
      Pass 2 — rapidfuzz fuzzy matching: catches anything keyword matching missed
    """
    # ── Pass 1: keyword-based ─────────────────────────────────────────────────
    keyword_hits = 0
    for entry in index:
        raw = str(entry["data"].get(classify_by, "") or "").strip()
        if not raw or raw.lower() in ("unknown", "other", "none", "null", ""):
            continue
        label = _keyword_group(raw)
        if label and entry["data"][classify_by] != label:
            print(f"  Keyword grouped: '{raw}' -> '{label}'")
            entry["data"][classify_by] = label
            keyword_hits += 1

    print(f"  Keyword grouping: {keyword_hits} remapped")

    # ── Pass 2: rapidfuzz ─────────────────────────────────────────────────────
    try:
        from rapidfuzz import fuzz, process as rf_process
    except ImportError:
        print("  rapidfuzz not installed — skipping fuzzy pass.")
        return index

    def _norm(s: str) -> str:
        return re.sub(r'\s+', ' ', s.replace('_', ' ').replace('-', ' ')).strip().lower()

    canonicals: list[str] = []
    canonicals_norm: list[str] = []

    for entry in index:
        raw = str(entry["data"].get(classify_by, "") or "").strip()
        if not raw or raw.lower() in ("unknown", "other", "none", "null", ""):
            continue

        raw_norm = _norm(raw)

        if not canonicals:
            canonicals.append(raw)
            canonicals_norm.append(raw_norm)
            continue

        match = rf_process.extractOne(raw_norm, canonicals_norm, scorer=fuzz.token_set_ratio)

        if match and match[1] >= threshold:
            canonical_original = canonicals[canonicals_norm.index(match[0])]
            if entry["data"][classify_by] != canonical_original:
                print(f"  Fuzzy grouped: '{raw}' -> '{canonical_original}' (score {match[1]})")
                entry["data"][classify_by] = canonical_original
        else:
            canonicals.append(raw)
            canonicals_norm.append(raw_norm)

    return index


def _smart_filename(data: dict, criteria: list[str], original: Path) -> str:
    """
    Choose a meaningful filename from document metadata.

    Priority:
      1. Second criterion value (e.g. 'name')
      2. Any other extracted field that looks like a name
      3. date field
      4. Sanitized original stem as fallback
    """
    if len(criteria) >= 2:
        second = criteria[1]
        val = str(data.get(second, "") or "").strip()
        if not _is_empty(val):
            return sanitize(val) + original.suffix

    name_candidates = [
        "full_name", "name", "employee_name", "vendor_name",
        "client_name", "sender", "recipient", "parties", "entity_name",
    ]
    for field in name_candidates:
        if field not in criteria and field in data:
            val = str(data[field] or "").strip()
            if not _is_empty(val):
                return sanitize(val) + original.suffix

    for field, raw_val in data.items():
        if field in criteria or field in _SKIP_CRITERIA:
            continue
        val = str(raw_val or "").strip()
        if not _is_empty(val) and field not in ("language", "document_type"):
            return sanitize(val) + original.suffix

    if "date" not in criteria and "date" in data:
        val = str(data["date"] or "").strip()
        if not _is_empty(val):
            return sanitize(val) + original.suffix

    return sanitize(original.stem) + original.suffix


def _deduplicate_by_stem(index: list[dict]) -> list[dict]:
    """
    For each unique filename stem, keep only ONE file.
    Example: 02a5a1f9ff80817d.jpg and 02a5a1f9ff80817d.docx share
    the same stem -> only the .jpg is kept (higher format priority).

    This is purely stem-based — two files with different stems are
    always treated as different documents, even if they have the same
    extracted name.
    """
    best: dict[str, dict] = {}  # stem -> best entry

    for entry in index:
        # Skip failed entries
        if "error" in entry.get("data", {}):
            continue

        stem = Path(entry["original_path"]).stem.lower()

        if stem not in best:
            best[stem] = entry
        else:
            current_priority = _format_priority(Path(best[stem]["original_path"]))
            new_priority      = _format_priority(Path(entry["original_path"]))
            if new_priority < current_priority:
                print(
                    f"  Dedup: keeping {Path(entry['original_path']).suffix} "
                    f"over {Path(best[stem]['original_path']).suffix} "
                    f"for stem '{stem}'"
                )
                best[stem] = entry

    total   = len([e for e in index if "error" not in e.get("data", {})])
    kept    = len(best)
    skipped = total - kept
    print(f"  Deduplication: {kept} unique stems kept, {skipped} duplicates removed")

    return list(best.values())


def organize(index: list[dict], output_dir: str, criteria: list[str]) -> None:
    """
    Copy all indexed files into a nested folder hierarchy based on chosen criteria.
    - Deduplicates by filename stem (same stem = same document, keep best format)
    - Renames files using the second criteria field value (e.g. person's name)
    """
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    # ── Deduplicate by stem before copying ────────────────────────────────────
    print(f"\nDeduplicating {len(index)} indexed files by filename stem ...")
    unique_entries = _deduplicate_by_stem(index)
    print(f"  {len(unique_entries)} unique documents to organize.\n")

    success = 0
    skipped = 0

    for entry in unique_entries:
        src  = Path(entry["original_path"])
        data = entry.get("data", {})

        if not src.exists():
            print(f"  File not found, skipping: {src.name}")
            skipped += 1
            continue

        # Build folder path from criteria values
        parts = []
        for criterion in criteria:
            raw_val = data.get(criterion)
            val = str(raw_val).strip() if raw_val is not None else ""
            parts.append(sanitize(val) if not _is_empty(val) else "Unknown")

        dest_dir = output_path.joinpath(*parts)
        dest_dir.mkdir(parents=True, exist_ok=True)

        # Smart filename
        smart_name = _smart_filename(data, criteria, src)
        dest_file  = dest_dir / smart_name

        # Resolve duplicates (different stems that produced the same name)
        counter = 1
        stem    = Path(smart_name).stem
        suffix  = Path(smart_name).suffix
        while dest_file.exists():
            dest_file = dest_dir / f"{stem}_{counter}{suffix}"
            counter += 1

        try:
            shutil.copy2(str(src), str(dest_file))
            print(f"  {src.name} -> {dest_file.relative_to(output_path)}")
            success += 1
        except Exception as e:
            print(f"  Could not copy {src.name}: {e}")
            skipped += 1

    print(f"\n{success} file(s) organized, {skipped} skipped.")
"""Text extraction for uploaded contracts. No AI here — pure parsing."""
import fitz  # PyMuPDF
import docx
from fastapi import HTTPException

SUPPORTED_EXTS = {".pdf", ".docx"}


def _finalize(full_text: str, segments: list[dict], metadata: dict) -> dict:
    metadata["char_count"] = len(full_text)
    metadata["word_count"] = len(full_text.split())
    metadata["num_segments"] = len(segments)
    return {"full_text": full_text, "segments": segments, "metadata": metadata}


def extract_pdf(path: str) -> dict:
    try:
        pdf = fitz.open(path)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not open PDF: {e}")

    if pdf.page_count == 0:
        pdf.close()
        raise HTTPException(status_code=422, detail="PDF has no pages.")

    segments, full_text_parts = [], []
    for i, page in enumerate(pdf, start=1):
        text = page.get_text("text").strip()
        segments.append({"index": i, "page_number": i, "heading": None, "text": text})
        full_text_parts.append(text)

    metadata = {"source_type": "pdf", "num_pages": pdf.page_count}
    pdf.close()
    full_text = "\n\n".join(t for t in full_text_parts if t).strip()

    if not full_text:
        raise HTTPException(status_code=422, detail="No extractable text found (scanned/image-only PDF?).")

    return _finalize(full_text, segments, metadata)


def extract_docx(path: str) -> dict:
    try:
        document = docx.Document(path)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not open DOCX: {e}")

    segments, full_text_parts, idx = [], [], 0
    for para in document.paragraphs:
        text = para.text.strip()
        if not text:
            continue
        idx += 1
        heading = (
            para.style.name
            if para.style and para.style.name.lower().startswith("heading")
            else None
        )
        segments.append({"index": idx, "page_number": None, "heading": heading, "text": text})
        full_text_parts.append(text)

    metadata = {"source_type": "docx", "num_pages": None}
    full_text = "\n\n".join(full_text_parts).strip()

    if not full_text:
        raise HTTPException(status_code=422, detail="No extractable text found in DOCX.")

    return _finalize(full_text, segments, metadata)


def extract_text(path: str, ext: str) -> dict:
    if ext == ".pdf":
        return extract_pdf(path)
    if ext == ".docx":
        return extract_docx(path)
    raise HTTPException(status_code=400, detail=f"Extraction not supported for '{ext}'")

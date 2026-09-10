from fastapi import UploadFile, HTTPException

ALLOWED_EXTENSIONS = {".pdf", ".docx"}


def validate_file(file: UploadFile, max_bytes: int) -> tuple[str, bytes]:
    filename = file.filename or ""
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {sorted(ALLOWED_EXTENSIONS)}",
        )

    contents = file.file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(contents) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds max size of {max_bytes // (1024 * 1024)}MB.",
        )

    return ext, contents

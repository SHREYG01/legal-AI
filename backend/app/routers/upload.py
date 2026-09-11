import json
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException

from app.core.config import settings
from app.models.schemas import ContractDetails, ContractMetadata, UploadResponse
from app.services.contract_ingestion import ingest_contract
from app.services.vector_store import delete_chunks

router = APIRouter(prefix="/api/contracts", tags=["upload"])


@router.post("/upload", response_model=UploadResponse)
async def upload_contract(file: UploadFile = File(...)) -> UploadResponse:
    try:
        result = ingest_contract(file)
    finally:
        await file.close()
    return UploadResponse(**result)


def _contract_paths(contract_id: str) -> tuple[Path, Path]:
    """Return the source and extraction paths for a stored contract."""
    upload_dir = Path(settings.upload_dir)
    extraction_path = upload_dir / f"{contract_id}.json"
    source_paths = [
        path for path in upload_dir.glob(f"{contract_id}.*")
        if path != extraction_path and path.is_file()
    ]
    if not extraction_path.is_file() or not source_paths:
        raise HTTPException(status_code=404, detail="Contract not found")
    return source_paths[0], extraction_path


def _read_contract(contract_id: str) -> ContractDetails:
    source_path, extraction_path = _contract_paths(contract_id)
    try:
        with extraction_path.open("r", encoding="utf-8") as file:
            extraction = json.load(file)
    except (OSError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=500, detail=f"Failed to read contract metadata: {exc}")

    metadata = extraction.get("metadata", {})
    contract_metadata = ContractMetadata(
        contract_id=contract_id,
        filename=extraction.get("original_filename", source_path.name),
        size_bytes=extraction.get("size_bytes", source_path.stat().st_size),
        upload_date=extraction.get(
            "upload_date",
            datetime.fromtimestamp(source_path.stat().st_mtime, tz=timezone.utc).isoformat(),
        ),
        num_pages=metadata.get("num_pages"),
        num_segments=metadata.get("num_segments", len(extraction.get("segments", []))),
    )
    return ContractDetails(**contract_metadata.model_dump(), extraction=extraction)


@router.get("", response_model=list[ContractMetadata])
async def list_contracts() -> list[ContractMetadata]:
    upload_dir = Path(settings.upload_dir)
    if not upload_dir.exists():
        return []

    contracts = []
    for extraction_path in upload_dir.glob("*.json"):
        try:
            contracts.append(_read_contract(extraction_path.stem))
        except HTTPException:
            # Ignore incomplete or malformed entries in the upload cache.
            continue
    return [ContractMetadata(**contract.model_dump(exclude={"extraction"})) for contract in contracts]


@router.get("/{contract_id}", response_model=ContractDetails)
async def get_contract(contract_id: str) -> ContractDetails:
    return _read_contract(contract_id)


@router.delete("/{contract_id}", status_code=204)
async def delete_contract(contract_id: str) -> None:
    source_path, extraction_path = _contract_paths(contract_id)
    try:
        source_path.unlink()
        extraction_path.unlink()
        for cached_path in extraction_path.parent.glob(f"{contract_id}_*.json"):
            cached_path.unlink()
        delete_chunks(contract_id)
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Failed to delete contract: {exc}")

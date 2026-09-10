from fastapi import APIRouter, UploadFile, File

from app.models.schemas import UploadResponse
from app.services.contract_ingestion import ingest_contract

router = APIRouter(prefix="/api/contracts", tags=["upload"])


@router.post("/upload", response_model=UploadResponse)
async def upload_contract(file: UploadFile = File(...)) -> UploadResponse:
    try:
        result = ingest_contract(file)
    finally:
        await file.close()
    return UploadResponse(**result)

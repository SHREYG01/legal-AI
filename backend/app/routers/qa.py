from fastapi import APIRouter, HTTPException

from app.models.schemas import QuestionRequest, AnswerResponse
from app.services.rag import answer_question
from app.services.llm_client import LLMError

router = APIRouter(prefix="/api/contracts", tags=["qa"])


@router.post("/{contract_id}/ask", response_model=AnswerResponse)
async def ask_question(contract_id: str, payload: QuestionRequest) -> AnswerResponse:
    if not payload.question.strip():
        raise HTTPException(status_code=400, detail="Question must not be empty.")

    try:
        result = answer_question(contract_id, payload.question)
    except LLMError as e:
        raise HTTPException(status_code=502, detail=str(e))

    return AnswerResponse(**result)

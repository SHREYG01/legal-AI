"""LLM client. Provider is configurable via LLM_PROVIDER in .env.

Only 'anthropic' is implemented; add more branches in generate_answer() as needed.
"""
import anthropic

from app.core.config import settings


class LLMError(Exception):
    pass


def generate_answer(system_prompt: str, user_prompt: str, max_tokens: int = 500) -> str:
    if settings.llm_provider == "anthropic":
        return _generate_anthropic(system_prompt, user_prompt, max_tokens)
    raise LLMError(f"Unsupported LLM_PROVIDER: '{settings.llm_provider}'")


def _generate_anthropic(system_prompt: str, user_prompt: str, max_tokens: int) -> str:
    if not settings.anthropic_api_key:
        raise LLMError("ANTHROPIC_API_KEY is not set in .env")

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    try:
        response = client.messages.create(
            model=settings.llm_model,
            max_tokens=max_tokens,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
    except anthropic.APIError as e:
        raise LLMError(f"LLM request failed: {e}")

    return "".join(block.text for block in response.content if block.type == "text").strip()

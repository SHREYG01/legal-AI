# Gemini to Groq API Migration Plan & Edge Case Handbook

> **Reference**: Also available at the workspace root as [`plan.md`](file:///d:/Legal_AI/plan.md).

---

## 1. Executive Summary & Context

- **Current State**:
  - The project (`Legal_AI`) previously targeted Anthropic Claude and Google Gemini via REST calls in `backend/app/services/llm_client.py`.
  - The `.env` file contained an active Groq API key (`gsk_...`) configured under `GEMINI_API_KEY` and `LLM_PROVIDER=gemini` with model `gemini-3.6-flash`.
  - Testing confirmed that Groq's edge proxy rejected `urllib.request` requests with HTTP 403 (due to default Python User-Agent), and rejected requests with large or unspecified `max_tokens` with HTTP 429 on OTPM (Output Tokens Per Minute).
- **Target State**:
  - Full first-class support for **Groq** via OpenAI-compatible REST endpoints (`https://api.groq.com/openai/v1/chat/completions`).
  - Native configuration options: `LLM_PROVIDER=groq`, `GROQ_API_KEY`, `GROQ_BASE_URL`, `LLM_MODEL`.
  - Verified working models for legal extraction: `openai/gpt-oss-120b`, `openai/gpt-oss-20b`, and `qwen/qwen3.8-27b`.
  - Comprehensive handling of 10 edge cases including Cloudflare anti-bot blocking, OTPM limits, rate limiting retries, array vs object JSON output parsing, and silent mock fallback logging.

---

## 2. The 10 Critical Edge Cases & Solutions

### Edge Case 1: Cloudflare HTTP 403 Forbidden on Python `urllib`
- **Symptom**: `urllib.error.HTTPError: HTTP Error 403: Forbidden` when calling `api.groq.com`.
- **Root Cause**: Python's standard `urllib.request` sends `User-Agent: Python-urllib/3.12`. Groq sits behind Cloudflare, which flags this default header as bot traffic.
- **Solution**:
  - In `backend/app/services/llm_client.py`, inject `User-Agent: LegalAI-Assistant/1.0` in all outgoing HTTP headers.
  - Alternatively, utilize `httpx` (which is already listed in `requirements.txt`).

### Edge Case 2: Output Tokens Per Minute (OTPM) & Pre-Flight 429
- **Symptom**: `HTTP 429: Request too large for model ... on output tokens per minute (OTPM): Limit 1000, Requested 2048`.
- **Root Cause**: On Groq's on-demand tier, Groq enforces a strict OTPM quota. If `max_tokens` is omitted or set higher than remaining quota (e.g. default 2048), Groq rejects the request *before* starting inference.
- **Solution**:
  - Enforce explicit, conservative `max_tokens` across all caller functions:
    - Contract Q&A (`rag.py`): `max_tokens=500`
    - Batch Obligations & Deadlines (`obligations.py`, `deadlines.py`): `max_tokens=800`
    - Risk Analysis (`risk_analysis.py`): `max_tokens=800`
    - Summarization (`summarization.py`): `max_tokens=1000`
    - Comparison Summary (`comparison.py`): `max_tokens=1200`
  - Implement automatic exponential backoff retry on HTTP 429.

### Edge Case 3: Sequential Batch Flooding (RPM Limits)
- **Symptom**: Mid-contract extraction fails with 429 when processing long agreements with 5–15 batches.
- **Root Cause**: `analyze_risks`, `extract_obligations`, and `extract_deadlines` loop through batches synchronously without delay.
- **Solution**:
  - Add a subtle delay (`time.sleep(0.25)`) between consecutive batch calls.
  - Implement a 3-stage retry loop with exponential jitter (1s, 2s, 4s) when HTTP 429 occurs, parsing the `Retry-After` response header if provided.

### Edge Case 4: Whitespace and Formatting in `.env`
- **Symptom**: `HTTP Error 404: Model ' gemini-3.6-flash' not found` or key authentication errors.
- **Root Cause**: Whitespace (e.g. `LLM_MODEL= openai/gpt-oss-120b` with a leading space) copied accidentally into `.env`.
- **Solution**:
  - Strip `.strip()` on `settings.llm_provider`, `settings.llm_model`, and all API keys in `config.py` and `llm_client.py`.

### Edge Case 5: API Key Auto-Discovery & Backward Compatibility
- **Symptom**: App fails with `GROQ_API_KEY is not set` when user only populated `GEMINI_API_KEY` or `OPENAI_API_KEY` with their Groq key.
- **Root Cause**: Transition period where keys may reside in old environment variables.
- **Solution**:
  - Implement fallback resolver in `llm_client.py`:
    ```python
    def _get_groq_key() -> str:
        key = settings.groq_api_key.strip()
        if key:
            return key
        if settings.openai_api_key.strip().startswith("gsk_"):
            return settings.openai_api_key.strip()
        if settings.gemini_api_key.strip().startswith("gsk_"):
            return settings.gemini_api_key.strip()
        return ""
    ```

### Edge Case 6: JSON Mode — Root Object vs Array Mismatch
- **Symptom**: `ValidationError` or empty results `[]` when extracting risks or obligations.
- **Root Cause**:
  - OpenAI/Groq's `response_format: {"type": "json_object"}` strictly requires the root to be a JSON Object `{}`.
  - However, `risk_analysis` and `obligations` prompts ask for a JSON Array `[...]`.
  - If the model wraps findings into `{"risks": [...]}` or `{"findings": [...]}`, the existing code `if not isinstance(data, list): return []` returns empty results.
- **Solution**:
  - Enhance `parse_json_loose()` or the batch response parsers to check if `data` is a dictionary with a single list value, and extract it:
    ```python
    if isinstance(data, dict):
        for val in data.values():
            if isinstance(val, list):
                return val
    ```

### Edge Case 7: Markdown Code Fences & Commentary
- **Symptom**: `json.JSONDecodeError` when open-source LLMs prepend conversational text or markdown code fences (` ```json ... ``` `).
- **Root Cause**: Models like Qwen or Llama occasionally add preambles even when instructed not to.
- **Solution**:
  - `parse_json_loose()` in `app/utils/json_parsing.py` isolates substrings between outermost `{...}` or `[...]` and strips markdown delimiters.

### Edge Case 8: Context Window Overflows
- **Symptom**: `HTTP Error 400: context_length_exceeded`.
- **Root Cause**: Gemini supports 1,000,000+ tokens; Groq models vary between 8,192 and 131,072 tokens. Passing unchunked full-text documents will crash Groq.
- **Solution**:
  - Preserve the Map-Reduce pipeline in `summarization.py` (`MAP_CHUNK_CHARS = 6000`).
  - Maintain batch limits in `extraction_batching.py` (`MAX_BATCH_CHARS = 6000`).
  - Cap diff items in `comparison.py` to `MAX_CHANGES_FOR_LLM = 30`.

### Edge Case 9: Silent Mock Fallback Obscuring Failures
- **Symptom**: User believes Groq is working, but backend is secretly returning hardcoded mock templates.
- **Root Cause**: `Settings.mock_fallback = True` swallows any `LLMError` and immediately returns dummy data.
- **Solution**:
  - Add explicit `logger.warning()` reporting the exact HTTP status code and error body whenever fallback to mock occurs.
  - Set `MOCK_FALLBACK=false` by default in `.env` for production or active testing.

### Edge Case 10: Model Deprecations & 404 Diagnostics
- **Symptom**: `HTTP Error 404: Not Found` when Groq decommissions older model IDs (e.g. `llama3-70b-8192`).
- **Root Cause**: Rapid iteration of Groq model offerings.
- **Solution**:
  - Provide descriptive error messaging when a 404 occurs, suggesting tested model candidates: `openai/gpt-oss-120b`, `openai/gpt-oss-20b`, and `qwen/qwen3.8-27b`.

---

## 3. Step-by-Step Implementation Steps

### Step 1: Update Environment Configuration
Edit `backend/.env` and `backend/.env.example`:
```env
# --- LLM provider ---
LLM_PROVIDER=groq
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=openai/gpt-oss-120b
MOCK_FALLBACK=false
```

### Step 2: Update `backend/app/core/config.py`
1. Add `groq_api_key: str = ""`
2. Add `groq_base_url: str = "https://api.groq.com/openai/v1"`
3. Update default `llm_provider: str = "groq"`
4. Update default `llm_model: str = "openai/gpt-oss-120b"`

### Step 3: Enhance `backend/app/services/llm_client.py`
1. **Custom User-Agent**: Add `"User-Agent": "LegalAI-Assistant/1.0"` in `_post_json()`.
2. **Exponential Backoff**: Catch `HTTPError` 429 and retry up to 3 times with exponential backoff (e.g., 1s, 2s, 4s).
3. **Groq Provider Branch**: In `generate_answer()`, handle `provider == "groq"`:
   - Resolve Groq key via `_get_groq_key()`.
   - Call `_generate_groq()` pointing to `settings.groq_base_url`.
4. **Mock Fallback Logging**: Add terminal warning log before invoking `_generate_mock()`.

### Step 4: Enhance `backend/app/utils/json_parsing.py`
Support dictionary unwrapping so that if an LLM returns `{"risks": [...]}` or `{"obligations": [...]}` instead of a bare list, callers requiring a list receive the inner array.

### Step 5: Add Pacing in Batch Extraction Loops
In `risk_analysis.py`, `obligations.py`, and `deadlines.py`, add `time.sleep(0.25)` between sequential batch requests to avoid overwhelming the OTPM/RPM window.

### Step 6: Automated & Live Testing
1. Run `pytest` across all existing tests.
2. Add `tests/test_llm_groq.py` to verify:
   - User-Agent injection
   - Key auto-fallback
   - 429 backoff retry
   - JSON loose parser unwrapping
   - Live generation via Groq

---

## 4. Verification Checklist

- [ ] `GET http://localhost:8000/health` returns status `healthy`.
- [ ] Direct call to `generate_answer` using Groq completes with sub-second latency.
- [ ] Contract upload and summary generation successfully outputs parsed fields (`contract_purpose`, `parties`, etc.).
- [ ] Risk analysis generates classified risk cards without triggering 429 OTPM errors.
- [ ] Q&A endpoint responds with grounded citations.
- [ ] Terminal logs show 0 silent mock fallbacks and 0 Cloudflare 403 errors.

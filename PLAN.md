# AI Legal Contract Assistant — Master Implementation Plan

> **Goal**: Guide an AI agent or developer step-by-step to complete the AI Legal Contract Assistant end-to-end without regressions, skipped steps, or missing connections.

---

## 🧭 Project Status Overview

| Component | Status | Missing Gaps |
|---|---|---|
| **Backend AI Pipeline** | 85% Complete | Missing CORS, `GET /api/contracts` list endpoint, and multi-provider LLM support. |
| **Backend Storage** | Functional (JSON cache) | Uses `./uploads/*.json` files. PostgreSQL not implemented (can remain file-based for MVP). |
| **Frontend UI** | 80% Complete | Static pages look great but load 100% hardcoded mock data from `mockData.ts`. |
| **Frontend API Integration** | 0% Complete | No API service, no `axios`/`fetch` calls, upload button does nothing. |
| **Demo Data & Testing** | 20% Complete | No `demo_contracts/` folder; tests only cover upload/extraction basics. |

---

## 📌 Phase 1: Environment & Dependency Setup

### 1.1 Backend Environment
1. Create and activate a Python virtual environment:
   ```bash
   cd backend
   python -m venv venv
   # Windows:
   .\venv\Scripts\activate
   # Linux/macOS:
   source venv/bin/activate
   ```
2. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Create `.env` from `.env.example`:
   - Set `ANTHROPIC_API_KEY` or configure alternative provider keys (e.g., `GEMINI_API_KEY` or `OPENAI_API_KEY`).
   - Confirm `UPLOAD_DIR=./uploads` and `CHROMA_PERSIST_DIR=./chroma_db`.

### 1.2 Frontend Environment
1. Navigate to `frontend`:
   ```bash
   cd ../frontend
   npm install
   npm install axios
   ```
2. Verify dev server starts:
   ```bash
   npm run dev
   ```

---

## 📌 Phase 2: Backend Completion & Polish

### 2.1 Add CORS Middleware to `backend/app/main.py`
* **Problem**: The React app running at `http://localhost:5173` will be blocked by browsers due to missing CORS headers on FastAPI (`http://localhost:8000`).
* **Task**:
  - In `backend/app/main.py`, import `from fastapi.middleware.cors import CORSMiddleware`.
  - Add middleware:
    ```python
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    ```

### 2.2 Add Contract Management Endpoints (`backend/app/routers/upload.py`)
* **Problem**: Currently there is only `POST /upload`. The frontend cannot fetch the list of uploaded contracts to display on Dashboard or Contracts pages.
* **Task**:
  - Implement `GET /api/contracts`:
    - Reads `./uploads` directory.
    - Scans for all `{contract_id}.json` files (metadata files saved during ingestion).
    - Returns a list of contracts: `contract_id`, `filename`, `size_bytes`, `upload_date`, `num_pages`, `num_segments`.
  - Implement `GET /api/contracts/{contract_id}`:
    - Returns metadata and basic extraction details for a single contract.
  - Implement `DELETE /api/contracts/{contract_id}`:
    - Removes `{contract_id}.*` files from `./uploads/` and deletes corresponding chunks from ChromaDB.

### 2.3 Multi-Provider LLM Client (`backend/app/services/llm_client.py`)
* **Problem**: Currently hardcoded strictly to Anthropic (`claude-sonnet-5`). If the user does not have an Anthropic key, the app fails on Q&A, summary, risks, and comparison.
* **Task**:
  - Update `llm_client.py` and `config.py` to support multiple providers:
    1. **`groq`**: Ultra-fast inference via Groq's OpenAI-compatible API (`openai/gpt-oss-120b`, `qwen/qwen3.8-27b`). See detailed [GROQ_MIGRATION_PLAN.md](file:///d:/Legal_AI/legal-AI/GROQ_MIGRATION_PLAN.md) and [`plan.md`](file:///d:/Legal_AI/plan.md).
    2. **`gemini`**: Google Gemini via REST endpoint.
    3. **`anthropic`**: Claude via `anthropic` library.
    4. **`openai`**: OpenAI / OpenRouter via OpenAI-compatible endpoint.
    5. **`mock` / fallback**: Deterministic rule-based mock responses for development/offline testing without burning tokens.

### 2.4 Verify Backend Endpoints
* Start backend server: `uvicorn app.main:app --reload --port 8000`
* Check health: `GET http://localhost:8000/health`
* Run upload test: `pytest` in `backend/`

---

## 📌 Phase 3: Frontend API Layer & Data Models

### 3.1 Setup Axios API Client (`frontend/src/services/api.ts`)
* Create `frontend/src/services/api.ts` with:
  - `uploadContract(file: File): Promise<UploadResponse>`
  - `getContracts(): Promise<ContractMetadata[]>`
  - `getContract(contractId: string): Promise<ContractDetails>`
  - `deleteContract(contractId: string): Promise<void>`
  - `getSummary(contractId: string): Promise<SummaryResponse>`
  - `getClauses(contractId: string, force?: boolean): Promise<ClausesResponse>`
  - `getRisks(contractId: string, force?: boolean): Promise<RiskResponse>`
  - `getObligations(contractId: string, force?: boolean): Promise<ObligationsResponse>`
  - `getDeadlines(contractId: string, force?: boolean): Promise<DeadlinesResponse>`
  - `askQuestion(contractId: string, question: string): Promise<AnswerResponse>`
  - `compareContracts(fileA: File, fileB: File): Promise<ComparisonResponse>`

### 3.2 Harmonize TypeScript Types (`frontend/src/types/index.ts`)
* Ensure frontend types match backend Pydantic models in `backend/app/models/schemas.py`:
  - `ContractSummary`, `ClauseClassification`, `RiskFinding`, `Obligation`, `DeadlinesSummary`, `ComparisonResponse`.

---

## 📌 Phase 4: Frontend View-by-View Integration

Work on one page at a time to prevent regressions.

### 4.1 `ContractsPage.tsx` & `UploadZone.tsx`
* Update `UploadZone.tsx`:
  - Pass `onFileSelected(file: File)` callback.
  - Show upload progress spinner and status messages.
* Update `ContractsPage.tsx`:
  - Replace `mockContracts` with state: `const [contracts, setContracts] = useState<ContractMetadata[]>([])`.
  - Fetch contracts on mount with `api.getContracts()`.
  - On file drop/selection, trigger `api.uploadContract(file)`.
  - On success, refresh contracts list and navigate to `/contracts/:id`.

### 4.2 `DashboardPage.tsx`
* Replace static numbers with dynamic calculations from `contracts`:
  - Contracts analyzed count = `contracts.length`.
  - Fetch summary/risks for recent contracts or compute aggregate metrics.
  - Show recent uploads with click-through to analysis view.

### 4.3 `ContractAnalysisPage.tsx`
* Use `useParams<{ id: string }>()` to get current `contract_id`.
* Fetch data on tab activation (with caching to avoid re-fetching):
  - **Overview Tab**: Shows contract stats, purpose, parties, and quick risk overview.
  - **Summary Tab**: Calls `api.getSummary(id)` -> renders structured cards.
  - **Clauses Tab**: Calls `api.getClauses(id)` -> renders clause cards with category filter tags.
  - **Risks Tab**: Calls `api.getRisks(id)` -> renders risk severity badges and evidence quotes.
  - **Obligations Tab**: Calls `api.getObligations(id)` -> renders party/obligation/deadline table.
  - **Deadlines Tab**: Calls `api.getDeadlines(id)` -> renders chronological deadlines and dates.
  - **Ask AI Tab**: Interactive chat component connected to `api.askQuestion(id, prompt)`.
* Add loading skeletons (`<LoadingState />`) and error handling for failed backend requests.

### 4.4 `AskAIPage.tsx`
* Populate the contract dropdown selector with real contracts from `api.getContracts()`.
* Connect user prompt submit button to `api.askQuestion(selectedContractId, question)`.
* Display source citation pills (page number, chunk excerpt, confidence/distance) returned by RAG.

### 4.5 `ComparisonPage.tsx`
* Allow user to:
  - Option A: Select two existing uploaded contracts from dropdowns.
  - Option B: Drop two new files directly to compare.
* Call `POST /api/contracts/compare` with two files.
* Render AI change summary and granular diff cards (`ADDED`, `REMOVED`, `MODIFIED`).

---

## 📌 Phase 5: Demo Contracts & End-to-End Testing

### 5.1 Create `demo_contracts/` Folder
Generate 3 realistic sample contracts:
1. `demo_contracts/SaaS_Service_Agreement_v1.pdf`: Standard SaaS agreement with vendor-favorable terms.
2. `demo_contracts/SaaS_Service_Agreement_v2.pdf`: Revised version with modified liability caps, payment terms, and confidentiality clauses (ideal for comparison testing).
3. `demo_contracts/Non_Disclosure_Agreement.docx`: DOCX format NDA to test DOCX extraction pipeline.

### 5.2 End-to-End Verification Run
1. Start backend: `uvicorn app.main:app --reload --port 8000`
2. Start frontend: `npm run dev`
3. Perform test flow:
   - [ ] Upload `SaaS_Service_Agreement_v1.pdf`.
   - [ ] Verify extraction, chunk count, and automatic redirect to analysis view.
   - [ ] Review Summary, Classified Clauses, Risks, and Obligations.
   - [ ] Ask 2 questions in Ask AI:
     - "What are the payment terms?" -> Verifies grounded citation.
     - "Who is responsible for patent infringement?" -> Verifies fallback handling if not present.
   - [ ] Compare `v1` and `v2` on Comparison page -> Verify diff cards and AI change summary.

---

## 📌 Phase 6: Final Polish & Documentation

1. **Verify Builds**:
   - Backend: Run all tests with `pytest`.
   - Frontend: Run `npm run build` to ensure TypeScript compilation without errors.
2. **Update README**:
   - Check off completed steps in the build order table.
   - Document how to configure API keys (`.env`).
   - Add sample screenshots or terminal run commands.

---

## 🚀 Execution Order Reference

```
Phase 2.1 (CORS) ➔ Phase 2.2 (Contracts List API) ➔ Phase 3.1 & 3.2 (Frontend API Client & Types)
   ➔ Phase 4.1 (Upload & Contracts Page) ➔ Phase 4.3 (Analysis Page Tabs)
   ➔ Phase 4.4 (Ask AI) ➔ Phase 4.5 (Comparison Page) ➔ Phase 5 (Demo Contracts & Testing)
```

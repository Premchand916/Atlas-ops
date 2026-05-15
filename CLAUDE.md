# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Read every session. No exceptions.

## RESPONSE RULES
- Zero filler. Lead with answer. Bullets > paragraphs.
- Code blocks always — never abbreviate inside them.
- After every task: give exact git commit command.

## PROJECT
- **What:** AI co-founder team. 6 agents (CoS, CTO, CMO, CFO, COO, Research) for solo founders.
- **Founder:** Premchand Ballu | **Deadline:** June 5, 2026 | **Price:** $49/month
- **Domain:** auxteam.in | **Repo:** github.com/Premchand916/atlas
- **Tagline:** "You're the CEO. Everything below you is AI."

## STACK (FROZEN — no changes through June 5)
- Backend: FastAPI (Python 3.13) + Google ADK 1.33 + Cloud Run
- Agents: Google ADK `LlmAgent` — all on `gemini-2.5-flash`
- DB: Firestore (`atlas-b8cb1`) — ADC set, quota project = atlas-b8cb1
- Frontend: React 18 + TypeScript + Tailwind v4 + Firebase Auth
- Streaming: SSE (not WebSocket)

## DEV COMMANDS

### Backend
```bash
# Activate venv (from repo root), then start on port 8002
source .venv/bin/activate
cd services/atlas-runtime
uvicorn app.main:app --port 8002 --reload
```

### Frontend
```bash
cd services/atlas-frontend
npm install        # first time
npm run dev        # http://localhost:5173
npm run build      # production build (tsc + vite)
npm run lint       # eslint check
```

### Deploy to Cloud Run
```bash
# From repo root — requires gcloud CLI + secrets already in Secret Manager
bash services/atlas-runtime/deploy.sh
```

### Test Stripe webhooks locally
```bash
stripe listen --forward-to localhost:8002/billing/webhook
stripe trigger checkout.session.completed
```

No automated test suite yet. Adversarial test for tenant isolation: `tests/adversarial/test_tenant_isolation.py` (created in S12).

## ENVIRONMENT VARIABLES

### Backend (`services/atlas-runtime/.env`) — never commit
```
GEMINI_API_KEY=...
GITHUB_TOKEN=...
STRIPE_SECRET_KEY=...        # optional — activates Stripe MCP in CFO
STRIPE_WEBHOOK_SECRET=...    # required from S15 onwards
STRIPE_PRICE_ID=price_xxx    # required from S15 onwards
```

### Frontend (`services/atlas-frontend/.env.local`) — never commit
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
VITE_BACKEND_URL=http://localhost:8002   # set to https://api.auxteam.in for prod
```

### Cloud Run (via Secret Manager + `--set-env-vars`)
```
GOOGLE_CLOUD_PROJECT=atlas-b8cb1
ALLOWED_ORIGINS=https://auxteam.in,https://www.auxteam.in
GEMINI_API_KEY   → secret: gemini-api-key
GITHUB_TOKEN     → secret: github-token
STRIPE_SECRET_KEY → secret: stripe-secret-key
```

## ARCHITECTURE

### Request flow
```
Browser → Firebase Auth (Google OAuth)
       → GET idToken → POST /chat/<agent>
                        Authorization: Bearer <idToken>
Backend → app/auth.py:require_uid() verifies token via Firebase Admin SDK
       → uid becomes startup_id (user namespace for Firestore + sessions)
       → run_agent_stream() → ADK Runner → SSE back to browser
```

### Firestore collections
```
users/{uid}/                     ← CoS startup profile (save_tool / get_tool)
  tasks/{task_id}                ← COO task CRUD
sessions/{session_id}            ← added S13: persistent session storage
subscriptions/{uid}              ← added S15: Stripe subscription lifecycle
usage/{uid}/daily/{date}         ← added S17: per-uid cost tracking
rate_limits/{uid}_{hour_key}     ← added S17: per-uid rate limiting
```

### Agent patterns — two kinds

**Singleton** (CoS, CMO, COO, Research, Morning Brief): module-level `LlmAgent` created at import time.
```python
# agents/cos/agent.py
cos_agent = LlmAgent(name="chief_of_staff", ...)
# app/main.py
cos_runner = Runner(agent=cos_agent, ...)
```

**Factory + lifespan** (CTO, CFO): agents holding MCP subprocess connections (`McpToolset` over stdio). Created in `app/main.py`'s `@asynccontextmanager lifespan`. Must call `await toolset.get_tools()` on startup and `await toolset.close()` on shutdown. Any new agent adding an MCP toolset must follow this pattern.

### Tool pattern — ToolContext (REQUIRED from S12)

All tools must read tenant scope from `ToolContext`, never accept `startup_id` as an LLM-fillable parameter. This closes an IDOR where the LLM could be prompted to query another user's Firestore data.

```python
# CORRECT — uid comes from server-verified session state
from google.adk.tools import ToolContext

def list_tasks(tool_context: ToolContext, status: str | None = None) -> list[dict]:
    uid = tool_context.state["uid"]   # set server-side in /chat handler, not by LLM
    q = db.collection("users").document(uid).collection("tasks")
    if status:
        q = q.where("status", "==", status)
    return [doc.to_dict() | {"id": doc.id} for doc in q.stream()]
```

Session state is seeded in the `/chat/*` handler from the verified Firebase token:
```python
state={"uid": uid, "startup_id": uid, "email": user.get("email")}
```

### Session management
`FirestoreSessionService` at `app/services/firestore_session.py` (added S13). Replaces `InMemorySessionService` — sessions survive cold starts. Document ID = `{app_name}_{user_id}_{session_id}` to avoid collisions (multiple users share session_id "default"). Events stored as JSON-string array, capped at 100 to stay under Firestore's 1 MB doc limit.

### Morning Brief (`SequentialAgent`)
Three sub-agents run in sequence: `task_brief` (Firestore) → `market_brief` (google_search) → `brief_synthesizer` (no tools). Each writes to its own `output_key`; the synthesizer reads prior outputs from conversation state.

### Entitlement middleware (added S16)
`app/middleware/entitlement.py:require_active_subscription` depends on `subscriptions/{uid}`. Entitled statuses: `trialing`, `active`. All other statuses → 402. Applied to every `/chat/*` route.

### SSE event format
```
data: {"status": "started", "agent": "<name>", "startup_id": "<uid>"}
data: {"type": "chunk", "response": "<partial text>", "agent": "...", "startup_id": "..."}
data: {"response": "<final text>", "agent": "...", "startup_id": "..."}
```

## CURRENT STATE
```
Backend:  WORKING — port 8002 (v0.6.0)
Frontend: DONE — port 5173
Agents:   ALL 6 LIVE + Morning Brief SequentialAgent
Auth:     Firebase ID token required on /chat/* — startup_id DERIVED from uid
Landing:  Login.tsx is a full landing page — hero, agent grid, pricing
```

## AGENT STATUS
| Agent | Tools | Pattern |
|---|---|---|
| CoS (Chief-of-Staff) | Firestore save/get | Singleton |
| CTO | GitHub MCP (26 tools via `@modelcontextprotocol/server-github`) | Factory + lifespan |
| CMO | google_search only | Singleton |
| CFO | 5 FunctionTools (math) + optional Stripe MCP | Factory + lifespan |
| COO | Firestore task CRUD | Singleton |
| Research | google_search only | Singleton |
| Morning Brief | SequentialAgent (task+market+synthesizer) | Singleton |

## API ENDPOINTS
```
GET  /health
GET  /
POST /chat/cos | /chat/cto | /chat/cmo | /chat/cfo | /chat/coo | /chat/research | /chat/morning-brief
POST /billing/checkout-session   ← S15
POST /billing/webhook            ← S15 (no auth — Stripe signature verification instead)
POST /billing/portal-session     ← S16
Headers: Authorization: Bearer <Firebase ID token>   ← REQUIRED on /chat/* and /billing/* except webhook
Body:    { message: str, session_id: str }
```

## HARD RULES
1. Never use `google.generativeai` — ADK only.
2. **google_search + FunctionTools = 400 error.** Cannot mix in same agent. google_search-only: CMO, Research. FunctionTool-only: CFO, COO.
3. CFO LLM never does arithmetic — always calls a FunctionTool. (`code_execution` does NOT exist in google-adk 1.33.)
4. **No tool may accept `startup_id`, `user_id`, or `uid` as an LLM-fillable parameter.** Always use `tool_context.state["uid"]`. This is the tenant isolation rule.
5. Any agent adding an MCP toolset must use the factory + lifespan pattern.
6. **No new features or stack changes.** Everything goes in `BACKLOG.md`. Deadline is June 5.
7. One session = one merged PR to `main`. No orphan branches.
8. Never commit: `.env` / `.env.local` / `venv/` / `__pycache__` / `.DS_Store` / `node_modules/`

## SESSION ROADMAP
| Session | Feature | Status |
|---|---|---|
| S01–S11 | Frontend, all 6 agents, auth, landing page | DONE |
| S12 | Tenant isolation: ToolContext binding, remove LLM-fillable startup_id | DONE |
| S13 | FirestoreSessionService — replace InMemorySessionService | **CURRENT** |
| S14 | Cloud Run deploy + auxteam.in + Firebase Hosting | May 17 |
| S15 | Stripe Checkout + webhook + subscriptions/{uid} | May 20 |
| S16 | Paywall middleware + trial logic + entitlement checks | May 23 |
| S17 | Observability + rate limits + demo video | May 27 |
| S18 | Final QA + Devpost submission + launch prep | May 31 |
| Jun 5 | Submit by 23:59 PT | DEADLINE |

## GIT FORMAT
```bash
git add <files>
git commit -m "feat(scope): what changed"
git push
```
Types: feat / fix / chore / refactor

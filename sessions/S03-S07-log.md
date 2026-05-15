# ATLAS Session Log — S03 to S07

## What Was Done

### S03 — CTO Agent + GitHub MCP
- Created `agents/cto/agent.py` — `LlmAgent` with `MCPToolset` pointing to `npx @github/mcp-server`
- 26 GitHub tools available (list repos, create issues, review PRs, etc.)
- CTO uses FastAPI `lifespan` (not module-level) — MCP subprocess must start/stop cleanly
- `_cto_toolset.get_tools()` called on startup to warm MCP connection
- Endpoint: `POST /chat/cto`

### S04 — CMO Agent + Search
- Created `agents/cmo/agent.py` — `LlmAgent` with only `google_search`
- Created `agents/cmo/tools.py` — Firestore content draft save/get (NOT wired into agent)
- **Error hit:** `400 INVALID_ARGUMENT: Built-in tools (google_search) and Function Calling cannot be combined`
  - Fix: removed all FunctionTools from cmo_agent; kept tools.py for future use
- Endpoint: `POST /chat/cmo`

### S05 — CFO Agent + Financial Calculators
- Pre-analysis: discovered `code_execution` does NOT exist in `google-adk==1.33` (CLAUDE.md was wrong)
- Fixed HARD RULE in CLAUDE.md to reference FunctionTool pattern
- Created `agents/cfo/tools.py` — 5 pure Python FunctionTools:
  - `calculate_runway(cash, burn)` → months + zero-cash date
  - `calculate_mrr(customers, price)` → MRR + ARR
  - `calculate_unit_economics(price, cogs, churn, cac)` → LTV, LTV:CAC, payback
  - `calculate_break_even(fixed_costs, price, variable_cost)` → break-even units + revenue
  - `project_revenue(current_mrr, growth_rate, months)` → monthly projection list
- Created `agents/cfo/agent.py` — wired all 5 tools
- No Stripe yet — deferred to S10
- Endpoint: `POST /chat/cfo`

### S06 — COO Agent + Task Management
- Created `agents/coo/tools.py` — Firestore task CRUD:
  - `create_task(title, startup_id, description, priority, due_date)` → auto-ID via `.add()`
  - `list_tasks(startup_id, status)` → sorted by priority (high→medium→low)
  - `update_task_status(task_id, status, startup_id)` → validates status enum
  - `delete_task(task_id, startup_id)` → checks existence first
  - `_serialize()` helper: converts `DatetimeWithNanoseconds` → `str` before JSON
- Subcollection pattern: `startups/{startup_id}/tasks/{task_id}`
- Created `agents/coo/agent.py` — wired all 4 task tools
- Endpoint: `POST /chat/coo`

### S07 — Research Agent + Google Search
- Created `agents/research/agent.py` — `LlmAgent` with only `google_search`
- Designed google_search-only from the start (no FunctionTools conflict)
- Live test: returned TAM analysis for "AI productivity tools for solo founders" with 2024-2025 citations
- Endpoint: `POST /chat/research`

### main.py Updates (across S04–S07)
- Added module-level runners: `cmo_runner`, `cfo_runner`, `coo_runner`, `research_runner`
- Added endpoints: `/chat/cmo`, `/chat/cfo`, `/chat/coo`, `/chat/research`
- Status string updated: `"S07 — all 6 agents live"`

### Security Review (after S07)
- Ran `/security-review` on all new agent code
- 5 candidate findings — all filtered as false positives (confidence <8/10)
- CORS wildcard noted as pre-deploy concern, not a code vulnerability

---

## Errors & Fixes

| Error | Cause | Fix |
|---|---|---|
| `400 INVALID_ARGUMENT: Built-in tools and Function Calling cannot be combined` | CMO had google_search + FunctionTools together | Removed FunctionTools from cmo_agent; google_search-only |
| CLAUDE.md said `code_execution` exists in google-adk | It does NOT exist in google-adk==1.33 | Updated HARD RULE to FunctionTool pattern |
| Firestore timestamp JSON serialization | `DatetimeWithNanoseconds` not JSON-serializable | `_serialize()` helper converts to `str()` |

---

## Critical ADK Constraint (permanent, applies to all future agents)
**`google_search` (GoogleTool) + FunctionTools = 400 error. Cannot mix.**
- google_search-only agents: CMO, Research
- FunctionTool-only agents: CFO, COO
- Hybrid (MCP only): CTO (MCP is not a GoogleTool, no conflict)

---

## Next Sessions
| Session | Feature | Notes |
|---|---|---|
| S08 | Morning Brief SequentialAgent | Most complex — ADK multi-agent orchestration |
| S09 | Cloud Run deploy | — |
| S10 | Stripe payments | `@stripe/mcp` added to CFO, `STRIPE_SECRET_KEY` in .env |
| S11 | Demo + landing page | — |

After billing enabled on aistudio.google.com: change `gemini-2.5-flash` → `gemini-2.5-pro` in CTO, CMO, Research agents.

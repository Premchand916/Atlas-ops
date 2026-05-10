# ATLAS — Claude Code Context
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

## STACK (FROZEN)
- Backend: FastAPI (Python 3.13) + Google ADK + Cloud Run
- Agents: Google ADK `LlmAgent` — all on `gemini-2.5-flash` (switch to pro once billing enabled)
- DB: Firestore (`atlas-b8cb1`) — ADC set, quota project = atlas-b8cb1
- Frontend: React 18 + TypeScript + Tailwind v4 + shadcn/ui + Firebase Auth
- Streaming: SSE (not WebSocket)

## CURRENT STATE
```
Backend:  WORKING — port 8001
          Start: cd services/atlas-runtime && source ../../.venv/bin/activate
                 uvicorn app.main:app --port 8001
Frontend: DONE — port 5173 (npm run dev in services/atlas-frontend)
          .env.local NOT committed (has Firebase keys)
Agents:   ALL 6 LIVE + Morning Brief SequentialAgent — S08 complete
Deployed: NOT DEPLOYED — local only
Payments: NOT DONE — S10
```

## AGENT STATUS
| Agent | Tools | Status |
|---|---|---|
| CoS (Chief-of-Staff) | Firestore save/get | WORKING |
| CTO | GitHub MCP (26 tools) | WORKING |
| CMO | google_search only | WORKING |
| CFO | 5 FunctionTools (math) | WORKING |
| COO | Firestore task CRUD | WORKING |
| Research | google_search only | WORKING |

## API ENDPOINTS
```
GET  /health
GET  /
POST /chat/cos | /chat/cto | /chat/cmo | /chat/cfo | /chat/coo | /chat/research
Body: { message: str, startup_id: str, session_id: str }
SSE events: started → chunk → response (final)
```

## REPO STRUCTURE
```
atlas/
├── CLAUDE.md
├── sessions/S03-S07-log.md   ← full session log (errors, fixes, decisions)
└── services/atlas-runtime/
    ├── app/main.py            ← FastAPI + runners + SSE
    ├── agents/
    │   ├── cos/agent.py + tools.py   (Firestore profile)
    │   ├── cto/agent.py              (GitHub MCP, lifespan-managed)
    │   ├── cmo/agent.py + tools.py   (google_search; tools.py unused — S10)
    │   ├── cfo/agent.py + tools.py   (runway/mrr/unit_econ/break_even/projection)
    │   ├── coo/agent.py + tools.py   (task CRUD in Firestore)
    │   └── research/agent.py         (google_search)
    └── .env  ← GEMINI_API_KEY (never commit)
```

## HARD RULES
1. Never use `google.generativeai` — ADK only.
2. **google_search + FunctionTools = 400 error.** Cannot mix in same agent. google_search-only: CMO, Research. FunctionTool-only: CFO, COO.
3. CFO LLM never does arithmetic — always calls a FunctionTool. (`code_execution` does NOT exist in google-adk 1.33.)
4. Never commit: `.env` / `venv/` / `__pycache__` / `.DS_Store` / `node_modules/`
5. Ship working over perfect.

## SESSION ROADMAP
| Session | Feature | Status |
|---|---|---|
| S01–S07 | Frontend, Firestore, all 6 agents | DONE |
| S08 | Morning Brief SequentialAgent | DONE |
| S09 | Cloud Run deploy | **NEXT** |
| S10 | Stripe payments (`@stripe/mcp` → CFO) | pending |
| S11 | Demo video + landing page | pending |

## GIT FORMAT
```bash
git add <files>
git commit -m "feat(scope): what changed"
git push
```
Types: feat / fix / chore / refactor

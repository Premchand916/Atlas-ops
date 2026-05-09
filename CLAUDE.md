# ATLAS — Claude Code Context File
> Read this every session. No exceptions.

---

## RESPONSE RULES (enforce always)
- Zero filler. No pleasantries. No "Great question!"
- Fragments OK. Drop articles (a/an/the).
- Lead with answer, not preamble.
- Bullets > paragraphs.
- Code blocks for all code. Never abbreviate inside code blocks.
- Short synonyms: use/fix/build/check (not utilize/implement/construct/verify)
- After every task: give exact git commit command.

---

## PROJECT: ATLAS
**What:** AI co-founder team for solo startup founders. 6 specialist agents (CTO, CMO, CFO, COO, Research) coordinated by Chief-of-Staff orchestrator.  
**Founder:** Premchand Ballu  
**Deadline:** June 5, 2026 (Google for Startups AI Agents Challenge)  
**Domain:** auxteam.in  
**Repo:** github.com/Premchand916/atlas  
**Tagline:** "You're the CEO. Everything below you is AI."  
**Price:** $49/month

---

## CURRENT STATE
```
Backend:   WORKING — FastAPI + Google ADK + CoS agent on gemini-2.5-flash
           SSE streaming confirmed live. Dead code removed from main.py.
           tools.py: Firestore lazy-init wired (needs GCP ADC to write)
           Port: 8001 (8000 taken by another local project)
           Start: cd services/atlas-runtime && source ../../.venv/bin/activate
                  uvicorn app.main:app --port 8001

Frontend:  DONE (S01) — services/atlas-frontend/
           React 18 + TypeScript + Tailwind v4 + Firebase Auth
           Login page → Google OAuth → Chat UI → CoS SSE stream
           Run: cd services/atlas-frontend && npm run dev (port 5173)
           Firebase project: atlas-b8cb1
           NOTE: .env.local NOT committed (has Firebase keys)

Firestore: PARTIALLY WIRED — lazy-init in tools.py
           Needs GCP ADC: gcloud auth application-default login
           OR service account key → GOOGLE_APPLICATION_CREDENTIALS in .env
           GCP project: atlas-prod-2026 (separate from Firebase atlas-b8cb1)

Auth:      DONE (Firebase Google OAuth, frontend only)
Payments:  NOT DONE
Agents:    CoS only — CTO/CMO/CFO/COO/Research not built
Deployed:  NOT DEPLOYED — local only
```

---

## REPO STRUCTURE
```
atlas/
├── CLAUDE.md                          ← this file (repo root)
├── sessions/                          ← session task files
│   ├── S01-frontend.md
│   └── S02-firestore.md
├── services/
│   └── atlas-runtime/
│       ├── app/
│       │   └── main.py                ← FastAPI + ADK runner + SSE
│       ├── agents/
│       │   └── cos/
│       │       ├── agent.py           ← CoS LlmAgent (gemini-2.5-flash)
│       │       └── tools.py           ← in-memory save/get (not Firestore yet)
│       ├── requirements.txt
│       └── .env                       ← GEMINI_API_KEY (never commit)
└── frontend/                          ← EMPTY — S01 builds this
```

---

## TECH STACK (FROZEN — no changes without explicit decision)
```
Backend:    FastAPI (Python 3.13) + Google ADK + Cloud Run
Agents:     Google ADK LlmAgent
            gemini-2.5-flash → COO, CFO, routine tasks (cheap)
            gemini-2.5-pro   → CTO, CMO, Research, CoS (reasoning)
DB:         Firestore (persistent memory)
Frontend:   React 18 + TypeScript + Tailwind CSS + shadcn/ui
Auth:       Firebase Auth (Google OAuth)
Hosting:    Firebase Hosting (frontend) + Cloud Run (backend)
Payments:   Stripe Checkout + Subscriptions
Streaming:  SSE (not WebSocket)
```

---

## AGENT STATUS
| Agent | Model | Status |
|---|---|---|
| Chief-of-Staff | gemini-2.5-flash | WORKING |
| CTO | gemini-2.5-pro | not built |
| CMO | gemini-2.5-pro | not built |
| CFO | gemini-2.5-flash | not built |
| COO | gemini-2.5-flash | not built |
| Research | gemini-2.5-pro | not built |

---

## API ENDPOINTS (live)
```
GET  /          → product metadata + agent list
GET  /health    → version check
POST /chat/cos  → CoS SSE streaming
                  body: { message: str, startup_id: str, session_id: str }
                  events: started → chunk (partial) → final response
```

---

## SESSION ORDER
One session = one feature. Finish fully before next.

| Session | Feature | Status |
|---|---|---|
| S01 | Frontend: React + Firebase Auth + Chat UI | DONE |
| S02 | Firestore: wire tools.py to real DB | NEXT |
| S03 | CTO Agent + GitHub MCP | pending |
| S04 | CMO Agent + social tools | pending |
| S05 | CFO Agent + Stripe | pending |
| S06 | COO Agent + tasks | pending |
| S07 | Research Agent + Search grounding | pending |
| S08 | Morning Brief SequentialAgent | pending |
| S09 | Cloud Run deploy | pending |
| S10 | Stripe payments + plans | pending |
| S11 | Demo video + landing page polish | pending |

---

## GIT COMMIT FORMAT
```bash
git add .
git commit -m "type(scope): what changed"
git push
```
Types: feat / fix / chore / refactor  
Examples:
  feat(cos): fix ADK session creation — SSE streaming now works
  feat(frontend): scaffold React app with Firebase Auth
  fix(tools): wire save_startup_profile to Firestore

Never commit: .env / venv/ / __pycache__ / .DS_Store / node_modules/

---

## HARD RULES
- Never use google.generativeai — ADK only
- Never do math in CFO agent — code_execution tool only
- Never commit secrets
- Never add new agent before S01+S02 complete
- Ship working over perfect
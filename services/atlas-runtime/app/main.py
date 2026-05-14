from pathlib import Path
import sys
from contextlib import asynccontextmanager

from dotenv import load_dotenv
import os

# Load .env before any agent imports so GITHUB_TOKEN etc. are in os.environ
load_dotenv()

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json

from google.adk.runners import Runner
from google.genai.types import Content, Part
from app.services.firestore_session import FirestoreSessionService

RUNTIME_ROOT = Path(__file__).resolve().parent.parent
if str(RUNTIME_ROOT) not in sys.path:
    sys.path.insert(0, str(RUNTIME_ROOT))

from agents.cos.agent import cos_agent
from agents.cto.agent import create_cto_agent
from agents.cmo.agent import cmo_agent
from agents.cfo.agent import create_cfo_agent
from agents.coo.agent import coo_agent
from agents.research.agent import research_agent
from agents.morning_brief.agent import morning_brief_agent
from app.auth import init_firebase_admin, require_uid

session_service = FirestoreSessionService()

cos_runner = Runner(
    agent=cos_agent,
    app_name="atlas",
    session_service=session_service,
)

cmo_runner = Runner(
    agent=cmo_agent,
    app_name="atlas",
    session_service=session_service,
)

coo_runner = Runner(
    agent=coo_agent,
    app_name="atlas",
    session_service=session_service,
)

research_runner = Runner(
    agent=research_agent,
    app_name="atlas",
    session_service=session_service,
)

morning_brief_runner = Runner(
    agent=morning_brief_agent,
    app_name="atlas",
    session_service=session_service,
)

cto_runner: Runner | None = None
cfo_runner: Runner | None = None
_cto_toolset = None
_cfo_toolset = None


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global cto_runner, _cto_toolset, cfo_runner, _cfo_toolset

    init_firebase_admin()

    cto_agent_inst, _cto_toolset = create_cto_agent()
    await _cto_toolset.get_tools()
    cto_runner = Runner(
        agent=cto_agent_inst,
        app_name="atlas",
        session_service=session_service,
    )

    cfo_agent_inst, _cfo_toolset = create_cfo_agent()
    if _cfo_toolset:
        await _cfo_toolset.get_tools()
    cfo_runner = Runner(
        agent=cfo_agent_inst,
        app_name="atlas",
        session_service=session_service,
    )

    yield

    if _cto_toolset:
        await _cto_toolset.close()
    if _cfo_toolset:
        await _cfo_toolset.close()


app = FastAPI(title="ATLAS Runtime", version="0.6.0", lifespan=lifespan)

# CORS: lock down origins via env (comma-separated). Defaults to local dev origin only.
_origins_env = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173")
_allowed_origins = [o.strip() for o in _origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"


def extract_text(event):
    if getattr(event, "content", None) and getattr(event.content, "parts", None):
        text = "".join(part.text for part in event.content.parts if getattr(part, "text", None))
        if text:
            return text
    response = getattr(event, "response", None)
    candidates = getattr(response, "candidates", None) or []
    if candidates:
        content = getattr(candidates[0], "content", None)
        parts = getattr(content, "parts", None) or []
        text = "".join(part.text for part in parts if getattr(part, "text", None))
        if text:
            return text
    return ""


async def run_agent_stream(
    runner: Runner,
    message: str,
    startup_id: str,
    session_id: str,
    agent_name: str,
):
    existing = await session_service.get_session(
        app_name="atlas",
        user_id=startup_id,
        session_id=session_id,
    )
    if existing is None:
        await session_service.create_session(
            app_name="atlas",
            user_id=startup_id,
            session_id=session_id,
            state={"uid": startup_id, "startup_id": startup_id},
        )

    async def stream():
        yield f"data: {json.dumps({'status': 'started', 'agent': agent_name, 'startup_id': startup_id})}\n\n"
        content = Content(role="user", parts=[Part(text=message)])
        latest_text = ""
        try:
            async for event in runner.run_async(
                user_id=startup_id,
                session_id=session_id,
                new_message=content,
            ):
                text = extract_text(event)
                if getattr(event, "partial", False) and text and text != latest_text:
                    latest_text = text
                    yield f"data: {json.dumps({'type': 'chunk', 'response': text, 'agent': agent_name, 'startup_id': startup_id})}\n\n"
                if event.is_final_response():
                    final_text = text or latest_text
                    yield f"data: {json.dumps({'response': final_text, 'agent': agent_name, 'startup_id': startup_id})}\n\n"
        except Exception:
            yield f"data: {json.dumps({'error': 'agent error', 'agent': agent_name})}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")


@app.get("/health")
def health():
    return {"status": "ATLAS Runtime is live", "version": "0.6.0"}


@app.post("/chat/cos")
async def chat_with_cos(request: ChatRequest, uid: str = Depends(require_uid)):
    return await run_agent_stream(cos_runner, request.message, uid, request.session_id, "chief-of-staff")


@app.post("/chat/cmo")
async def chat_with_cmo(request: ChatRequest, uid: str = Depends(require_uid)):
    return await run_agent_stream(cmo_runner, request.message, uid, request.session_id, "cmo")


@app.post("/chat/cfo")
async def chat_with_cfo(request: ChatRequest, uid: str = Depends(require_uid)):
    if cfo_runner is None:
        raise HTTPException(status_code=503, detail="CFO agent not ready")
    return await run_agent_stream(cfo_runner, request.message, uid, request.session_id, "cfo")


@app.post("/chat/coo")
async def chat_with_coo(request: ChatRequest, uid: str = Depends(require_uid)):
    return await run_agent_stream(coo_runner, request.message, uid, request.session_id, "coo")


@app.post("/chat/research")
async def chat_with_research(request: ChatRequest, uid: str = Depends(require_uid)):
    return await run_agent_stream(research_runner, request.message, uid, request.session_id, "research")


@app.post("/chat/cto")
async def chat_with_cto(request: ChatRequest, uid: str = Depends(require_uid)):
    if cto_runner is None:
        raise HTTPException(status_code=503, detail="CTO agent not ready")
    return await run_agent_stream(cto_runner, request.message, uid, request.session_id, "cto")


@app.post("/chat/morning-brief")
async def chat_morning_brief(request: ChatRequest, uid: str = Depends(require_uid)):
    return await run_agent_stream(
        morning_brief_runner,
        "Generate morning brief",
        uid,
        f"morning-{uid}",
        "morning-brief",
    )


@app.get("/")
def root():
    return {
        "product": "ATLAS",
        "tagline": "You're the CEO. Everything below you is AI.",
        "agents": ["chief-of-staff", "cto", "cmo", "cfo", "coo", "research"],
        "status": "S11 — auth + landing page",
    }

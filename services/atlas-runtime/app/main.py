from pathlib import Path
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
import os, json, asyncio

from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai.types import Content, Part

RUNTIME_ROOT = Path(__file__).resolve().parent.parent
if str(RUNTIME_ROOT) not in sys.path:
    sys.path.insert(0, str(RUNTIME_ROOT))

from agents.cos.agent import cos_agent

load_dotenv()

app = FastAPI(title="ATLAS Runtime", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

session_service = InMemorySessionService()
runner = Runner(
    agent=cos_agent,
    app_name="atlas",
    session_service=session_service
)

class ChatRequest(BaseModel):
    message: str
    startup_id: str = "default"
    session_id: str = "default"

@app.get("/health")
def health():
    return {"status": "ATLAS Runtime is live", "version": "0.2.0"}

@app.post("/chat/cos")
async def chat_with_cos(request: ChatRequest):
    """CoS chat with ADK runner + SSE streaming."""

    # Create session BEFORE stream starts
    existing = await session_service.get_session(
        app_name="atlas",
        user_id=request.startup_id,
        session_id=request.session_id
    )
    if existing is None:
        await session_service.create_session(
            app_name="atlas",
            user_id=request.startup_id,
            session_id=request.session_id
        )

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

    async def stream():
        yield f"data: {json.dumps({'status': 'started', 'agent': 'chief-of-staff', 'startup_id': request.startup_id})}\n\n"

        content = Content(
            role="user",
            parts=[Part(text=request.message)]
        )
        latest_text = ""
        async for event in runner.run_async(
            user_id=request.startup_id,
            session_id=request.session_id,
            new_message=content
        ):
            text = extract_text(event)
            if getattr(event, "partial", False) and text and text != latest_text:
                latest_text = text
                yield f"data: {json.dumps({'type': 'chunk', 'response': text, 'agent': 'chief-of-staff', 'startup_id': request.startup_id})}\n\n"

            if event.is_final_response():
                final_text = text or latest_text
                yield f"data: {json.dumps({'response': final_text, 'agent': 'chief-of-staff', 'startup_id': request.startup_id})}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")

@app.get("/")
def root():
    return {
        "product": "ATLAS",
        "tagline": "You're the CEO. Everything below you is AI.",
        "agents": ["chief-of-staff", "cto", "cmo", "cfo", "coo", "research"],
        "status": "Week 1 — CoS agent live"
    }

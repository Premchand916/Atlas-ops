from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import google.generativeai as genai
from dotenv import load_dotenv
import os
import json

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

app = FastAPI(title="ATLAS Runtime", version="0.1.0")

# Chief-of-Staff system prompt
COS_PROMPT = """
You are the Chief-of-Staff for a solo startup founder.
Your job is to onboard them by learning everything about their startup.

Ask these questions ONE AT A TIME in a natural conversation:
1. What is your startup called and what does it do?
2. Who is your target customer?
3. What problem are you solving for them?
4. What stage are you at? (idea / prototype / revenue)
5. What are your top 3 goals for the next 30 days?
6. What tools do you currently use? (GitHub, Slack, Notion, etc.)
7. What is your biggest blocker right now?

After all 7 answers, say:
"Perfect. I've briefed your team. Your agents are ready."

Be warm, sharp, and concise. You are a world-class Chief of Staff.
"""

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: list[Message]
    startup_id: str = "default"

@app.get("/health")
def health():
    return {"status": "ATLAS Runtime is live", "version": "0.1.0"}

@app.post("/chat/cos")
async def chat_with_cos(request: ChatRequest):
    """Chief-of-Staff onboarding conversation."""
    
    model = genai.GenerativeModel(
        model_name="gemini-2.0-flash",
        system_instruction=COS_PROMPT
    )
    
    # Build conversation history
    history = []
    for msg in request.messages[:-1]:  # all except last
        history.append({
            "role": "user" if msg.role == "user" else "model",
            "parts": [msg.content]
        })
    
    chat = model.start_chat(history=history)
    
    # Send latest message
    last_message = request.messages[-1].content
    response = chat.send_message(last_message)
    
    return {
        "response": response.text,
        "startup_id": request.startup_id,
        "agent": "chief-of-staff"
    }

@app.get("/")
def root():
    return {
        "product": "ATLAS",
        "tagline": "You're the CEO. Everything below you is AI.",
        "agents": [
            "chief-of-staff",
            "cto",
            "cmo", 
            "cfo",
            "coo",
            "research"
        ],
        "status": "Day 2 of 42 — building"
    }
import os
from google.cloud import firestore
from google.adk.tools import FunctionTool, ToolContext

_db = None

def _get_db():
    global _db
    if _db is None:
        _db = firestore.Client(project=os.environ.get("GOOGLE_CLOUD_PROJECT"))
    return _db


def save_startup_profile(tool_context: ToolContext, field: str, value: str) -> dict:
    """Save a field to the startup profile in Firestore."""
    uid = tool_context.state["uid"]
    _get_db().collection("startups").document(uid).set(
        {field: value}, merge=True
    )
    return {"saved": field, "value": value}


def get_startup_profile(tool_context: ToolContext) -> dict:
    """Get the full startup profile from Firestore."""
    uid = tool_context.state["uid"]
    doc = _get_db().collection("startups").document(uid).get()
    return doc.to_dict() if doc.exists else {}


save_tool = FunctionTool(func=save_startup_profile)
get_tool = FunctionTool(func=get_startup_profile)

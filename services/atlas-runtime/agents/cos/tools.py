import os
from google.cloud import firestore
from google.adk.tools import FunctionTool

_db = None

def _get_db():
    global _db
    if _db is None:
        _db = firestore.Client(project=os.environ.get("GOOGLE_CLOUD_PROJECT"))
    return _db


def save_startup_profile(field: str, value: str, startup_id: str = "default") -> dict:
    """Save a field to the startup profile in Firestore."""
    _get_db().collection("startups").document(startup_id).set(
        {field: value}, merge=True
    )
    return {"saved": field, "value": value}


def get_startup_profile(startup_id: str = "default") -> dict:
    """Get the full startup profile from Firestore."""
    doc = _get_db().collection("startups").document(startup_id).get()
    return doc.to_dict() if doc.exists else {}


save_tool = FunctionTool(func=save_startup_profile)
get_tool = FunctionTool(func=get_startup_profile)

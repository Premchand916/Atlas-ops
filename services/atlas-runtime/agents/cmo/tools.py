import os
import time
from google.cloud import firestore
from google.adk.tools import FunctionTool

_db = None


def _get_db():
    global _db
    if _db is None:
        _db = firestore.Client(project=os.environ.get("GOOGLE_CLOUD_PROJECT"))
    return _db


def save_content_draft(platform: str, content_type: str, content: str, startup_id: str = "default") -> dict:
    """Save a content draft to Firestore. platform: twitter|linkedin|newsletter|blog. content_type: post|thread|headline|cta."""
    doc_id = f"{platform}_{content_type}_{int(time.time())}"
    _get_db().collection("startups").document(startup_id).collection("content_drafts").document(doc_id).set(
        {
            "platform": platform,
            "content_type": content_type,
            "content": content,
            "created_at": firestore.SERVER_TIMESTAMP,
        }
    )
    return {"saved": doc_id, "platform": platform, "content_type": content_type}


def get_content_drafts(startup_id: str = "default", platform: str = "") -> dict:
    """Retrieve saved content drafts, optionally filtered by platform."""
    col = _get_db().collection("startups").document(startup_id).collection("content_drafts")
    query = col.where(filter=firestore.FieldFilter("platform", "==", platform)) if platform else col
    docs = list(query.stream())
    drafts = []
    for doc in docs:
        d = doc.to_dict()
        d["id"] = doc.id
        if "created_at" in d and d["created_at"] is not None:
            d["created_at"] = str(d["created_at"])
        drafts.append(d)
    return {"drafts": drafts, "count": len(drafts)}


save_draft_tool = FunctionTool(func=save_content_draft)
get_drafts_tool = FunctionTool(func=get_content_drafts)

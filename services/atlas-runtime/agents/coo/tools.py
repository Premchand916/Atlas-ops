import os
from google.cloud import firestore
from google.adk.tools import FunctionTool

_db = None


def _get_db():
    global _db
    if _db is None:
        _db = firestore.Client(project=os.environ.get("GOOGLE_CLOUD_PROJECT"))
    return _db


def _serialize(doc: dict) -> dict:
    for key in ("created_at", "updated_at"):
        if key in doc and doc[key] is not None:
            doc[key] = str(doc[key])
    return doc


def create_task(
    title: str,
    startup_id: str = "default",
    description: str = "",
    priority: str = "medium",
    due_date: str = "",
) -> dict:
    """Create a task. priority: high|medium|low. due_date: YYYY-MM-DD string or empty. Returns task_id."""
    _, ref = _get_db().collection("startups").document(startup_id).collection("tasks").add(
        {
            "title": title,
            "description": description,
            "priority": priority,
            "due_date": due_date,
            "status": "todo",
            "created_at": firestore.SERVER_TIMESTAMP,
            "updated_at": firestore.SERVER_TIMESTAMP,
        }
    )
    return {"task_id": ref.id, "title": title, "status": "todo", "priority": priority}


def list_tasks(startup_id: str = "default", status: str = "") -> dict:
    """List tasks. status filter: todo|in_progress|done|'' (all)."""
    col = _get_db().collection("startups").document(startup_id).collection("tasks")
    query = col.where(filter=firestore.FieldFilter("status", "==", status)) if status else col
    tasks = []
    for doc in query.stream():
        d = doc.to_dict()
        d["task_id"] = doc.id
        tasks.append(_serialize(d))
    tasks.sort(key=lambda t: ({"high": 0, "medium": 1, "low": 2}.get(t.get("priority", "medium"), 1)))
    return {"tasks": tasks, "count": len(tasks)}


def update_task_status(task_id: str, status: str, startup_id: str = "default") -> dict:
    """Update task status. status: todo|in_progress|done."""
    valid = {"todo", "in_progress", "done"}
    if status not in valid:
        return {"error": f"status must be one of {valid}"}
    ref = _get_db().collection("startups").document(startup_id).collection("tasks").document(task_id)
    doc = ref.get()
    if not doc.exists:
        return {"error": f"task {task_id} not found"}
    ref.update({"status": status, "updated_at": firestore.SERVER_TIMESTAMP})
    return {"task_id": task_id, "status": status, "updated": True}


def delete_task(task_id: str, startup_id: str = "default") -> dict:
    """Delete a task by ID."""
    ref = _get_db().collection("startups").document(startup_id).collection("tasks").document(task_id)
    if not ref.get().exists:
        return {"error": f"task {task_id} not found"}
    ref.delete()
    return {"task_id": task_id, "deleted": True}


create_task_tool = FunctionTool(func=create_task)
list_tasks_tool = FunctionTool(func=list_tasks)
update_task_tool = FunctionTool(func=update_task_status)
delete_task_tool = FunctionTool(func=delete_task)

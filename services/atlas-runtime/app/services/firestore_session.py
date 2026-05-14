"""
Firestore-backed session service — replaces InMemorySessionService.

Sessions survive cold starts. One Firestore read + one write per chat turn.
Document ID = f"{app_name}_{user_id}_{session_id}" to avoid collisions when
multiple users share a session_id like "default".

Events are stored as a JSON-string array, capped at max_events (default 100)
to stay well under Firestore's 1 MB document limit (~200 KB at 100 × 2 KB events).
"""

import json
import logging
import os
import time
import uuid
from typing import Any, Optional

from google.adk.events import Event
from google.adk.sessions import Session
from google.adk.sessions.base_session_service import (
    BaseSessionService,
    GetSessionConfig,
    ListSessionsResponse,
)
from google.cloud import firestore

logger = logging.getLogger(__name__)

_COLLECTION = "sessions"


def _doc_id(app_name: str, user_id: str, session_id: str) -> str:
    return f"{app_name}_{user_id}_{session_id}"


class FirestoreSessionService(BaseSessionService):
    """Firestore-backed ADK SessionService. Survives process restarts."""

    def __init__(self, project: str | None = None, max_events: int = 100):
        self._project = project or os.environ.get("GOOGLE_CLOUD_PROJECT")
        self.max_events = max_events
        self._db: firestore.AsyncClient | None = None

    def _get_db(self) -> firestore.AsyncClient:
        if self._db is None:
            self._db = firestore.AsyncClient(project=self._project)
        return self._db

    def _ref(self, app_name: str, user_id: str, session_id: str):
        return (
            self._get_db()
            .collection(_COLLECTION)
            .document(_doc_id(app_name, user_id, session_id))
        )

    @staticmethod
    def _serialize_events(events: list[Event]) -> list[str]:
        return [e.model_dump_json() for e in events]

    @staticmethod
    def _deserialize_events(raw: list[str]) -> list[Event]:
        out = []
        for s in raw:
            try:
                out.append(Event.model_validate_json(s))
            except Exception:
                logger.warning("Skipping malformed event entry in Firestore session")
        return out

    async def create_session(
        self,
        *,
        app_name: str,
        user_id: str,
        state: Optional[dict[str, Any]] = None,
        session_id: Optional[str] = None,
    ) -> Session:
        if not session_id:
            session_id = str(uuid.uuid4())

        # Strip app:/user: prefixed keys for v1 (we only persist session-scoped state).
        session_state = {
            k: v
            for k, v in (state or {}).items()
            if not k.startswith("app:") and not k.startswith("user:")
        }
        now = time.time()
        await self._ref(app_name, user_id, session_id).set(
            {
                "app_name": app_name,
                "user_id": user_id,
                "session_id": session_id,
                "state": session_state,
                "events": [],
                "last_update_time": now,
                "created_at": firestore.SERVER_TIMESTAMP,
            }
        )
        return Session(
            app_name=app_name,
            user_id=user_id,
            id=session_id,
            state=session_state,
            events=[],
            last_update_time=now,
        )

    async def get_session(
        self,
        *,
        app_name: str,
        user_id: str,
        session_id: str,
        config: Optional[GetSessionConfig] = None,
    ) -> Optional[Session]:
        snap = await self._ref(app_name, user_id, session_id).get()
        if not snap.exists:
            return None

        data = snap.to_dict()
        events = self._deserialize_events(data.get("events", []))
        state = data.get("state", {})
        last_update_time = data.get("last_update_time", 0.0)

        if config:
            if config.num_recent_events is not None:
                events = events[-config.num_recent_events:] if config.num_recent_events > 0 else []
            if config.after_timestamp:
                events = [
                    e for e in events
                    if e.timestamp and e.timestamp >= config.after_timestamp
                ]

        return Session(
            app_name=app_name,
            user_id=user_id,
            id=session_id,
            state=state,
            events=events,
            last_update_time=last_update_time,
        )

    async def list_sessions(
        self,
        *,
        app_name: str,
        user_id: Optional[str] = None,
    ) -> ListSessionsResponse:
        col = self._get_db().collection(_COLLECTION)
        query = col.where(
            filter=firestore.FieldFilter("app_name", "==", app_name)
        )
        if user_id:
            query = query.where(
                filter=firestore.FieldFilter("user_id", "==", user_id)
            )
        sessions = []
        async for snap in query.stream():
            data = snap.to_dict()
            sessions.append(
                Session(
                    app_name=data["app_name"],
                    user_id=data["user_id"],
                    id=data.get("session_id", snap.id),
                    state=data.get("state", {}),
                    events=[],
                    last_update_time=data.get("last_update_time", 0.0),
                )
            )
        return ListSessionsResponse(sessions=sessions)

    async def delete_session(
        self,
        *,
        app_name: str,
        user_id: str,
        session_id: str,
    ) -> None:
        await self._ref(app_name, user_id, session_id).delete()

    async def append_event(self, session: Session, event: Event) -> Event:
        if event.partial:
            return event
        # Base class: applies temp state, trims temp delta from event,
        # updates session.state from event.actions.state_delta, appends to session.events.
        event = await super().append_event(session=session, event=event)
        # Cap event list and persist state + events to Firestore.
        trimmed = session.events[-self.max_events:]
        session.events = trimmed
        await self._ref(session.app_name, session.user_id, session.id).update(
            {
                "state": session.state,
                "events": self._serialize_events(trimmed),
                "last_update_time": event.timestamp or time.time(),
            }
        )
        return event

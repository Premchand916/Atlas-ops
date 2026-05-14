"""
S13 unit tests — FirestoreSessionService.

Uses unittest.mock to patch Firestore AsyncClient so no real GCP credentials needed.
Run: cd services/atlas-runtime && pytest tests/test_firestore_session.py -v

Manual cold-start test (requires running backend + valid Firebase token):

    # Terminal 1
    source .venv/bin/activate && uvicorn app.main:app --port 8001

    # Terminal 2 — send intro message
    export TOKEN=<firebase_id_token>
    curl -s -H "Authorization: Bearer $TOKEN" \
         -H "Content-Type: application/json" \
         -d '{"message":"my startup is called Helix and we sell to dentists"}' \
         http://localhost:8001/chat/cos

    # Terminal 1 — Ctrl+C, restart uvicorn

    # Terminal 2 — follow-up that requires context
    curl -s -H "Authorization: Bearer $TOKEN" \
         -H "Content-Type: application/json" \
         -d '{"message":"what was my startup name again?"}' \
         http://localhost:8001/chat/cos
    # EXPECT: agent recalls "Helix" (context survived restart)
"""

import asyncio
import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.firestore_session import FirestoreSessionService, _doc_id


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_service(**kw) -> FirestoreSessionService:
    return FirestoreSessionService(project="test-project", **kw)


def _snap(exists: bool, data: dict = None):
    snap = MagicMock()
    snap.exists = exists
    snap.to_dict.return_value = data or {}
    snap.id = "snap_id"
    return snap


# ---------------------------------------------------------------------------
# Tests: _doc_id
# ---------------------------------------------------------------------------

def test_doc_id_is_unique_per_user():
    assert _doc_id("atlas", "alice", "default") != _doc_id("atlas", "bob", "default")


def test_doc_id_is_stable():
    assert _doc_id("atlas", "u1", "s1") == _doc_id("atlas", "u1", "s1")


# ---------------------------------------------------------------------------
# Tests: create_session
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_session_writes_to_firestore():
    svc = _make_service()
    mock_ref = AsyncMock()
    svc._ref = MagicMock(return_value=mock_ref)

    session = await svc.create_session(
        app_name="atlas",
        user_id="u1",
        session_id="s1",
        state={"uid": "u1", "startup_id": "u1"},
    )

    mock_ref.set.assert_awaited_once()
    call_data = mock_ref.set.call_args[0][0]
    assert call_data["app_name"] == "atlas"
    assert call_data["user_id"] == "u1"
    assert call_data["state"]["uid"] == "u1"
    assert call_data["events"] == []

    assert session.id == "s1"
    assert session.state["uid"] == "u1"


@pytest.mark.asyncio
async def test_create_session_strips_app_user_prefix():
    svc = _make_service()
    mock_ref = AsyncMock()
    svc._ref = MagicMock(return_value=mock_ref)

    await svc.create_session(
        app_name="atlas",
        user_id="u1",
        session_id="s1",
        state={"uid": "u1", "app:global_key": "x", "user:pref": "y"},
    )

    call_data = mock_ref.set.call_args[0][0]
    assert "app:global_key" not in call_data["state"]
    assert "user:pref" not in call_data["state"]
    assert call_data["state"]["uid"] == "u1"


@pytest.mark.asyncio
async def test_create_session_generates_id_when_none():
    svc = _make_service()
    mock_ref = AsyncMock()
    svc._ref = MagicMock(return_value=mock_ref)

    session = await svc.create_session(app_name="atlas", user_id="u1")

    assert session.id is not None and len(session.id) > 0


# ---------------------------------------------------------------------------
# Tests: get_session
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_session_returns_none_when_not_found():
    svc = _make_service()
    mock_ref = AsyncMock()
    mock_ref.get.return_value = _snap(exists=False)
    svc._ref = MagicMock(return_value=mock_ref)

    result = await svc.get_session(app_name="atlas", user_id="u1", session_id="s1")

    assert result is None


@pytest.mark.asyncio
async def test_get_session_deserializes_state_and_events():
    from google.adk.events import Event

    svc = _make_service()
    event = Event(author="user", invocation_id="inv1")
    serialized_events = svc._serialize_events([event])

    data = {
        "app_name": "atlas",
        "user_id": "u1",
        "session_id": "s1",
        "state": {"uid": "u1"},
        "events": serialized_events,
        "last_update_time": 1234567890.0,
    }
    mock_ref = AsyncMock()
    mock_ref.get.return_value = _snap(exists=True, data=data)
    svc._ref = MagicMock(return_value=mock_ref)

    session = await svc.get_session(app_name="atlas", user_id="u1", session_id="s1")

    assert session.state["uid"] == "u1"
    assert len(session.events) == 1
    assert session.events[0].author == "user"
    assert session.last_update_time == 1234567890.0


# ---------------------------------------------------------------------------
# Tests: event capping in append_event
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_append_event_caps_at_max_events():
    from google.adk.events import Event
    from google.adk.sessions import Session

    svc = _make_service(max_events=3)
    mock_ref = AsyncMock()
    svc._ref = MagicMock(return_value=mock_ref)

    session = Session(
        app_name="atlas",
        user_id="u1",
        id="s1",
        state={"uid": "u1"},
        events=[Event(author="agent", invocation_id=f"old{i}") for i in range(3)],
        last_update_time=time.time(),
    )

    new_event = Event(author="user", invocation_id="new1", turn_complete=True)
    # Patch super().append_event to avoid base-class Firestore interactions
    with patch.object(
        FirestoreSessionService.__bases__[0],
        "append_event",
        new=AsyncMock(side_effect=lambda session, event: _base_append(session, event)),
    ):
        await svc.append_event(session, new_event)

    # After cap: only 3 events retained (oldest dropped)
    assert len(session.events) == 3
    # The update was called with 3 serialized events
    call_kwargs = mock_ref.update.call_args[0][0]
    assert len(call_kwargs["events"]) == 3


def _base_append(session, event):
    """Minimal stand-in for BaseSessionService.append_event in tests."""
    session.events.append(event)
    return event


@pytest.mark.asyncio
async def test_append_event_skips_partial():
    from google.adk.events import Event
    from google.adk.sessions import Session

    svc = _make_service()
    mock_ref = AsyncMock()
    svc._ref = MagicMock(return_value=mock_ref)

    session = Session(
        app_name="atlas", user_id="u1", id="s1",
        state={}, events=[], last_update_time=time.time(),
    )
    partial_event = Event(author="agent", invocation_id="p1", partial=True)
    await svc.append_event(session, partial_event)

    mock_ref.update.assert_not_awaited()


# ---------------------------------------------------------------------------
# Tests: event roundtrip
# ---------------------------------------------------------------------------

def test_event_serialize_deserialize_roundtrip():
    from google.adk.events import Event

    svc = _make_service()
    events = [
        Event(author="user", invocation_id="u1"),
        Event(author="agent", invocation_id="a1"),
    ]
    raw = svc._serialize_events(events)
    assert all(isinstance(r, str) for r in raw)

    restored = svc._deserialize_events(raw)
    assert len(restored) == 2
    assert restored[0].author == "user"
    assert restored[1].author == "agent"


def test_deserialize_skips_malformed_entry():
    svc = _make_service()
    raw = ["not-json", '{"author":"user","invocation_id":"x"}']
    result = svc._deserialize_events(raw)
    # First entry is malformed; second might be valid or not depending on Event validator
    # Either way, no exception raised
    assert isinstance(result, list)

import firebase_admin
from firebase_admin import auth as fb_auth
from fastapi import Header, HTTPException, status


def init_firebase_admin():
    if not firebase_admin._apps:
        firebase_admin.initialize_app()


async def require_uid(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header",
        )
    token = authorization[len("Bearer "):]
    try:
        decoded = fb_auth.verify_id_token(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired ID token",
        )
    uid = decoded.get("uid")
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing uid",
        )
    return uid

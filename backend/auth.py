import logging
import os
from functools import lru_cache
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import create_client, Client

logger = logging.getLogger(__name__)
_bearer = HTTPBearer()


@lru_cache(maxsize=1)
def _get_supabase() -> Client:
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_KEY", "")
    if not url or not key:
        logger.warning("SUPABASE_URL or SUPABASE_SERVICE_KEY is not set")
    return create_client(url, key)


def _log_attempt(
    *,
    email: str,
    user_id: str | None,
    event: str,
    success: bool,
    ip_address: str | None = None,
    user_agent: str | None = None,
    error_msg: str | None = None,
) -> None:
    try:
        supabase = _get_supabase()
        supabase.table("login_attempts").insert({
            "email": email,
            "user_id": user_id,
            "event": event,
            "success": success,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "error_msg": error_msg,
        }).execute()
    except Exception as exc:
        logger.warning("Could not write login_attempt: %s", exc)


async def get_current_user(
    request: Request,
    creds: HTTPAuthorizationCredentials = Depends(_bearer),
) -> str:
    token = creds.credentials
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    try:
        supabase = _get_supabase()
        resp = supabase.auth.get_user(token)
        user = resp.user
        if not user:
            _log_attempt(
                email="unknown", user_id=None, event="login_failure",
                success=False, ip_address=ip, user_agent=ua,
                error_msg="Invalid or expired token",
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )
        logger.debug("Authenticated user: %s", user.id)
        _log_attempt(
            email=user.email or "", user_id=str(user.id), event="login_success",
            success=True, ip_address=ip, user_agent=ua,
        )
        return str(user.id)
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("Auth verification failed: %s", exc)
        _log_attempt(
            email="unknown", user_id=None, event="login_failure",
            success=False, ip_address=ip, user_agent=ua, error_msg=str(exc),
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

import hmac
import re
from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import APIKeyHeader

from app.core.config import settings

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


@dataclass(frozen=True)
class APIIdentity:
    user_id: str | None
    authenticated: bool


def _fingerprint_api_key(api_key: str) -> str:
    return f"api-key:{api_key[-8:]}"


async def get_api_identity(
    request: Request,
    api_key: Annotated[str | None, Depends(api_key_header)],
) -> APIIdentity:
    auth_required = settings.AUTH_ENABLED or settings.is_production
    if not auth_required:
        return APIIdentity(user_id=None, authenticated=False)

    if not settings.API_KEYS:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not configured.",
        )

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    for valid_key in settings.API_KEYS:
        if hmac.compare_digest(api_key, valid_key):
            x_user_id = request.headers.get("x-user-id")
            print(f"DEBUG: x_user_id header is {x_user_id}")
            final_user_id = None
            if x_user_id:
                cleaned_id = re.sub(r'[^a-zA-Z0-9_-]', '', x_user_id)
                if cleaned_id:
                    final_user_id = cleaned_id

            if not final_user_id:
                final_user_id = _fingerprint_api_key(api_key)

            print(f"DEBUG: final_user_id assigned is {final_user_id}")

            return APIIdentity(
                user_id=final_user_id,
                authenticated=True,
            )

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Invalid credentials.",
    )


async def require_api_identity(
    identity: Annotated[APIIdentity, Depends(get_api_identity)],
) -> APIIdentity:
    return identity

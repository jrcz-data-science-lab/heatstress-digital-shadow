from abc import ABC
from fastapi import Cookie, Response
from typing import Optional
import os
import shutil

from src.api.session import create_session


class SessionController(ABC):
    """
    Controller that should handle all session related functions
    """

    async def get_or_create_session(
        self,
        response: Response,
        session_id: Optional[str] = Cookie(default=None)
    ) -> str:
        """
        Return existing session_id or create a new one.
        Also ensures the QGIS session project exists on disk.
        """

        # 1. Get or create session id
        if session_id:
            sid = session_id
        else:
            sid = create_session()
            response.set_cookie(
                key="session_id",
                value=sid,
                httponly=True,
                secure=False,   # HTTP (local dev)
                samesite="Lax",
                path="/"
            )

        # 2. Ensure session project exists for QGIS Server
        base = "/data/server"
        src = os.path.join(base, "starting-map.qgz")
        dst_dir = os.path.join(base, "sessions", sid)
        dst = os.path.join(dst_dir, "map.qgz")

        os.makedirs(dst_dir, exist_ok=True)

        if os.path.exists(src) and not os.path.exists(dst):
            shutil.copyfile(src, dst)

        return sid
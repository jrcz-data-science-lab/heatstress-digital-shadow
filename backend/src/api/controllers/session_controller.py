from abc import ABC
from fastapi import Cookie, Response
from typing import Optional
import os
import re
import zipfile
import tempfile

_UUID_RE = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')

from src.api.session import create_session


def _copy_and_fix_qgz(src: str, dst: str) -> None:
    """
    Copy starting-map.qgz to a session dst, rewriting datasource paths.

    QGIS Desktop saves paths relative to wherever starting-map.qgz lives
    (data/server/), so new layers get stored as e.g. ./pet-version-kapelle.tif.
    Sessions sit two levels deeper (data/server/sessions/{id}/map.qgz), so
    those same files need to be referenced as ../../pet-version-kapelle.tif.

    This function rewrites every <datasource>./ occurrence to <datasource>../../
    inside the embedded .qgs file so the session map works without any manual
    path juggling.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        with zipfile.ZipFile(src, 'r') as z:
            z.extractall(tmpdir)

        for root, dirs, files in os.walk(tmpdir):
            for fname in files:
                if fname.endswith('.qgs'):
                    fpath = os.path.join(root, fname)
                    with open(fpath, 'r', encoding='utf-8') as f:
                        content = f.read()
                    content = content.replace('<datasource>./', '<datasource>../../')
                    with open(fpath, 'w', encoding='utf-8') as f:
                        f.write(content)

        dst_tmp = dst + '.tmp'
        try:
            with zipfile.ZipFile(dst_tmp, 'w', zipfile.ZIP_DEFLATED) as z:
                for root, dirs, files in os.walk(tmpdir):
                    for fname in files:
                        fpath = os.path.join(root, fname)
                        z.write(fpath, os.path.relpath(fpath, tmpdir))
            os.replace(dst_tmp, dst)
        finally:
            if os.path.exists(dst_tmp):
                os.unlink(dst_tmp)


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
        created = False
        if session_id and _UUID_RE.match(session_id):
            sid = session_id
        else:
            sid = create_session()
            created = True
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

        if os.path.exists(src) and (created or not os.path.exists(dst)):
            _copy_and_fix_qgz(src, dst)

        return sid
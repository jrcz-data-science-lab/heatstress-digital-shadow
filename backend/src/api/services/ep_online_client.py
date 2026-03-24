import httpx
from config import get_settings

settings = get_settings()

EP_ONLINE_BASE_URL = "https://public.ep-online.nl/api/v5"


class EpOnlineClient:
    """
    HTTP client for the EP-Online public API.
    Used to fetch energy performance labels (energieprestatie) per VBO.
    Docs: https://public.ep-online.nl/swagger
    """

    def __init__(self, api_key: str):
        self._client = httpx.AsyncClient(
            base_url=EP_ONLINE_BASE_URL,
            headers={"Authorization": api_key},
            timeout=10.0,
        )

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self._client.aclose()

    async def get_label_by_vbo(self, vbo_id: str) -> httpx.Response:
        """
        Fetch energy label(s) for a single VBO (verblijfsobject).
        vbo_id: 16-digit BAG VBO identificatie (e.g. '0687010000029139').
        Returns a list of label records, most recent first.
        """
        return await self._client.get(f"/PandEnergielabel/AdresseerbaarObject/{vbo_id}")


def get_ep_online_client() -> EpOnlineClient:
    """Dependency provider for the EP-Online client."""
    return EpOnlineClient(api_key=settings.EP_ONLINE_API_KEY)

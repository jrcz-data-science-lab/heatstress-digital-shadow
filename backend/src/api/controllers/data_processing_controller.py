
from abc import ABC
import os
import httpx
from src.api.requests import PlacedObjectsRequest
from fastapi.responses import JSONResponse
from typing import Optional

class DataProcessingController(ABC):
    """
    Controller that should handle all requests that are made to the 
    QGIS Container (via the api within it)
    """
    QGIS_API_BASE_URL: str = os.getenv('QGIS_URL', 'http://qgis:8000')

    async def get_processing_status(self):
        async with httpx.AsyncClient(timeout=5.0) as client:
            try:
                r = await client.get(f"{self.QGIS_API_BASE_URL}/pet/status")
                return r.json()
            except Exception:
                return {"message": "Idle"}

    async def update_map_placed_objects(
        self, 
        req: PlacedObjectsRequest,
        session_id: Optional[str] 
    ):
        endpoint = f"{self.QGIS_API_BASE_URL}/pet/update"
        payload = req.model_dump(mode="json")

        async with httpx.AsyncClient(timeout=1000.0) as client:
            try:
                response = await client.post(endpoint, json=payload, params={"session_id": session_id})
                response.raise_for_status()

                return JSONResponse(
                    status_code=response.status_code,
                    content=response.json()
                )
            except httpx.TimeoutException:
                return JSONResponse(
                    status_code=504,
                    content={"detail": "PET computation timed out — the processing took too long."}
                )
            except httpx.HTTPStatusError as e:
                try:
                    detail = e.response.json()
                except Exception:
                    detail = e.response.text
                return JSONResponse(
                    status_code=e.response.status_code,
                    content={"detail": detail}
                )

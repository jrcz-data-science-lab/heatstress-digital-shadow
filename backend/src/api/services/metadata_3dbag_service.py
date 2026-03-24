import httpx
import asyncio
import json
from fastapi import HTTPException
from src.api.services.metadata_3dbag_client import get_metadata_bag3d_client
from src.api.mappers.metadata_3dbag_mapper import Metadata3DBagMapper
from src.api.models.metadata_3dbag_model import AggregatedBagResponse
from src.api.exceptions import MappingError

class Metadata3DBagService:
    """
    Service class responsible for fetching and aggregating BAG data 
    from an external API using coordinates.
    """
    
    def __init__(self, api_client_factory, data_mapper):
        """
        Store the api_client_factory and the data_mapper as dependencies.
        """
        self._api_client_factory = api_client_factory
        self._mapper = data_mapper
    
    def _handle_bag_api_exceptions(self, e: Exception, bag_identifier: str):
        """
        Helper to map external BAG API exceptions (httpx errors) 
        to FastAPI HTTPExceptions.
        """
        if isinstance(e, httpx.HTTPStatusError):
            status_code = e.response.status_code
            
            if 400 <= status_code < 500:
                # 4xx errors (Not Found, Bad Request, Unauthorized, etc.)
                # Use 404 for specific "not found/invalid ID" case
                if status_code in (404, 400):
                    raise HTTPException(
                        status_code=404, 
                        detail=f"BAG data not found or identifier is invalid: {bag_identifier} (Upstream code: {status_code})"
                    )
                else:
                    # Catch-all for other 4xx errors
                    raise HTTPException(
                        status_code=400,
                        detail=f"Upstream client error for {bag_identifier}: {e.response.reason_phrase} (Upstream code: {status_code})"
                    )
            
            if status_code >= 500:
                # 5xx errors (Server Error) 
                raise HTTPException(
                    status_code=502, # 502 Bad Gateway is often better for upstream errors
                    detail=f"External BAG API server error (Upstream code {status_code}): {e}"
                )
            
        elif isinstance(e, httpx.RequestError):
            # Handle Network/Connection Errors (DNS, timeouts)
            raise HTTPException(
                status_code=503, # 503 Service Unavailable
                detail=f"Failed to connect to external BAG API: {e.__class__.__name__} error."
            )

        elif isinstance(e, json.JSONDecodeError):
            # Handle JSON Decoding Errors (non-JSON response)
            raise HTTPException(
                status_code=500, 
                detail=f"External BAG API returned invalid JSON content: {e}"
            )
        
        # General catch-all for unknown exceptions from an API call
        elif isinstance(e, Exception):
            raise HTTPException(
                status_code=500, 
                detail=f"An unexpected error occurred during API call for {bag_identifier}: {e.__class__.__name__}"
            )
    
    async def _search_pand_and_extract_bag_id(self, api_client, coords: list[float]) -> str:
        """Searches for PAND data by coordinates, handles exceptions, and extracts the BAG ID."""
        identifier = f"Coords: {coords}"
        try:
            pand_response = await api_client.search_pand_by_coords(coordinates=coords)
            pand_response.raise_for_status()
        except (httpx.HTTPStatusError, httpx.RequestError, json.JSONDecodeError) as e:
            self._handle_bag_api_exceptions(e, identifier)
        except Exception as e:
             self._handle_bag_api_exceptions(e, identifier) 
        
        raw_search_data = pand_response.json()
        pand_data = raw_search_data.get("_embedded", {}).get("panden", [])
        
        if not pand_data:
            raise HTTPException(
                status_code=404, 
                detail=f"No PAND (building) found at coordinates: {coords}."
            )

        try:
            # Assumes pand_data[0] is the relevant building
            raw_pand_data_with_nesting = pand_data[0] 
            self._structured_pand_data = self._mapper.map_pand_data(raw_pand_data_with_nesting)
            bag_id = self._structured_pand_data.bag_id
            
        except MappingError as e:
            raise HTTPException(status_code=500, detail=f"Internal data structuring failed after spatial search: {str(e)}")
        
        if not bag_id:
            raise HTTPException(
                status_code=500,
                detail="Building found, but the mapper failed to extract a valid BAG ID."
            )

        return bag_id

    async def _fetch_vbo_data(self, api_client, bag_id: str):
        """Fetches VBO data by BAG ID, handles exceptions, and maps the result."""
        identifier = bag_id
        vbo_task = api_client.get_verblijfsobjecten(bag_id)
        
        responses = await asyncio.gather(vbo_task, return_exceptions=True)
        vbo_response = responses[0]

        # Handle exceptions *during* the API call
        if isinstance(vbo_response, Exception):
            self._handle_bag_api_exceptions(vbo_response, identifier)
        
        try:
            vbo_response.raise_for_status()
        except httpx.HTTPStatusError as e:
            self._handle_bag_api_exceptions(e, identifier)
        
        raw_vbo_data = vbo_response.json()
        
        try:
            return self._mapper.map_vbo_data(raw_vbo_data)
        except MappingError as e:
            raise HTTPException(status_code=500, detail=f"VBO data structuring failed for BAG ID {bag_id}: {str(e)}")

    async def fetch_and_aggregate_by_bag_id(self, bag_id: str) -> AggregatedBagResponse:
        """
        Fetches and aggregates PAND and VBO data directly by BAG ID.
        Skips the coordinate-based spatial search — use this when the BAG ID
        is already known (e.g. read from a clicked 3D tileset feature property).
        """
        async with self._api_client_factory() as api_client:
            # Fetch pand and VBOs in parallel
            pand_task = api_client.get_pand(bag_id)
            vbo_task = api_client.get_verblijfsobjecten(bag_id)
            responses = await asyncio.gather(pand_task, vbo_task, return_exceptions=True)
            pand_response, vbo_response = responses

            # Handle pand exceptions
            if isinstance(pand_response, Exception):
                self._handle_bag_api_exceptions(pand_response, bag_id)
            try:
                pand_response.raise_for_status()
            except httpx.HTTPStatusError as e:
                self._handle_bag_api_exceptions(e, bag_id)

            # Handle VBO exceptions
            if isinstance(vbo_response, Exception):
                self._handle_bag_api_exceptions(vbo_response, bag_id)
            try:
                vbo_response.raise_for_status()
            except httpx.HTTPStatusError as e:
                self._handle_bag_api_exceptions(e, bag_id)

            try:
                structured_pand_data = self._mapper.map_pand_data(pand_response.json())
            except MappingError as e:
                raise HTTPException(status_code=500, detail=f"PAND data structuring failed for BAG ID {bag_id}: {str(e)}")

            try:
                structured_vbo_data = self._mapper.map_vbo_data(vbo_response.json())
            except MappingError as e:
                raise HTTPException(status_code=500, detail=f"VBO data structuring failed for BAG ID {bag_id}: {str(e)}")

        return AggregatedBagResponse(
            bag_id=bag_id,
            pand_data=structured_pand_data,
            verblijfsobject_data=structured_vbo_data,
        )

    async def fetch_and_aggregate(self, x_coord: float, y_coord: float) -> AggregatedBagResponse:
        """
        Asynchronously fetches and aggregates Pand and VBO data 
        by first searching spatially with coordinates, mapping the result
        to get the BAG ID, then querying VBO data by that ID.
        """
        coords = [x_coord, y_coord]
        
        # Temporary storage for PAND data to be accessible for aggregation
        self._structured_pand_data = None 
        
        async with self._api_client_factory() as api_client: 
            
            # Search PAND by coords
            bag_id = await self._search_pand_and_extract_bag_id(api_client, coords)
        
            # VBO FETCH by extracted ID
            structured_vbo_data = await self._fetch_vbo_data(api_client, bag_id)
        
        # AGGREGATION
        aggregated_data = {
            "bag_id": bag_id,
            "pand_data": self._structured_pand_data,
            "verblijfsobject_data": structured_vbo_data,
        }
    
        # Clean up temporary storage
        del self._structured_pand_data
        
        return AggregatedBagResponse(**aggregated_data)
    
def get_metadata_bag3d_service() -> Metadata3DBagService:
    """Factory function for FastAPI dependency injection."""
    mapper = Metadata3DBagMapper()
    return Metadata3DBagService(
        api_client_factory=get_metadata_bag3d_client,
        data_mapper=mapper
    )
        
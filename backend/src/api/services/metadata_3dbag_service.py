import httpx
import asyncio
import json
from fastapi import HTTPException
from src.api.services.metadata_3dbag_client import get_metadata_bag3d_client
from src.api.services.ep_online_client import get_ep_online_client
from src.api.mappers.metadata_3dbag_mapper import Metadata3DBagMapper
from src.api.models.metadata_3dbag_model import AggregatedBagResponse, AddressData, EnergieLabel, VboData
from src.api.exceptions import MappingError
from typing import Optional, List
from config import get_settings

settings = get_settings()


class Metadata3DBagService:
    """
    Service class responsible for fetching and aggregating BAG data
    from the Kadaster API and enriching VBOs with EP-Online energy labels.
    """

    def __init__(self, api_client_factory, data_mapper, ep_client_factory):
        self._api_client_factory = api_client_factory
        self._mapper = data_mapper
        self._ep_client_factory = ep_client_factory

    def _handle_bag_api_exceptions(self, e: Exception, bag_identifier: str):
        """
        Helper to map external BAG API exceptions (httpx errors)
        to FastAPI HTTPExceptions.
        """
        if isinstance(e, httpx.HTTPStatusError):
            status_code = e.response.status_code

            if 400 <= status_code < 500:
                if status_code in (404, 400):
                    raise HTTPException(
                        status_code=404,
                        detail=f"BAG data not found or identifier is invalid: {bag_identifier} (Upstream code: {status_code})"
                    )
                else:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Upstream client error for {bag_identifier}: {e.response.reason_phrase} (Upstream code: {status_code})"
                    )

            if status_code >= 500:
                raise HTTPException(
                    status_code=502,
                    detail=f"External BAG API server error (Upstream code {status_code}): {e}"
                )

        elif isinstance(e, httpx.RequestError):
            raise HTTPException(
                status_code=503,
                detail=f"Failed to connect to external BAG API: {e.__class__.__name__} error."
            )

        elif isinstance(e, json.JSONDecodeError):
            raise HTTPException(
                status_code=500,
                detail=f"External BAG API returned invalid JSON content: {e}"
            )

        elif isinstance(e, Exception):
            raise HTTPException(
                status_code=500,
                detail=f"An unexpected error occurred during API call for {bag_identifier}: {e.__class__.__name__}"
            )

    async def _fetch_ep_label_for_vbo(self, vbo_id: str) -> Optional[EnergieLabel]:
        """
        Fetch the most recent energy label for a single VBO from EP-Online.
        Returns None on any error or if no label exists — energy label is optional data.
        """
        if not settings.EP_ONLINE_API_KEY:
            return None
        try:
            async with self._ep_client_factory() as ep_client:
                response = await ep_client.get_label_by_vbo(vbo_id)
                if response.status_code != 200:
                    return None
                records = response.json()
                if not records:
                    return None
                # EP-Online returns an array; take the most recent by registratiedatum
                latest = sorted(
                    records,
                    key=lambda r: r.get("Registratiedatum") or "",
                    reverse=True
                )[0]
                return EnergieLabel(
                    energieklasse=latest.get("Energieklasse"),
                    energie_index=latest.get("Energie_Index"),
                    registratiedatum=latest.get("Registratiedatum"),
                    geldig_tot=latest.get("Geldig_tot"),
                    energiebehoefte=latest.get("Energiebehoefte"),
                    primaire_fossiele_energie=latest.get("Primaire_fossiele_energie"),
                    aandeel_hernieuwbare_energie=latest.get("Aandeel_hernieuwbare_energie"),
                    warmtebehoefte=latest.get("Warmtebehoefte"),
                    gebouwklasse=latest.get("Gebouwklasse"),
                )
        except Exception:
            return None

    @staticmethod
    def _map_address(raw: dict) -> Optional[AddressData]:
        """Extract the primary address from the /adressen response (first result)."""
        try:
            adressen = raw.get("_embedded", {}).get("adressen", [])
            if not adressen:
                return None
            first = adressen[0].get("adres", adressen[0])
            return AddressData(
                street=first.get("openbareRuimteNaam"),
                house_number=first.get("huisnummer"),
                house_letter=first.get("huisletter"),
                house_number_addition=first.get("huisnummertoevoeging"),
                postcode=first.get("postcode"),
                city=first.get("woonplaatsNaam"),
            )
        except Exception:
            return None

    async def _enrich_vbos_with_ep_labels(self, vbos: List[VboData]) -> List[VboData]:
        """Fetch EP-Online labels for all VBOs in parallel and attach them."""
        ep_tasks = [self._fetch_ep_label_for_vbo(vbo.bag_id) for vbo in vbos]
        labels = await asyncio.gather(*ep_tasks)
        return [
            vbo.model_copy(update={"energie_label": label})
            for vbo, label in zip(vbos, labels)
        ]

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
        Fetches and aggregates PAND and VBO data directly by BAG ID,
        then enriches each VBO with its EP-Online energy label in parallel.
        """
        async with self._api_client_factory() as api_client:
            pand_task = api_client.get_pand(bag_id)
            vbo_task = api_client.get_verblijfsobjecten(bag_id)
            addr_task = api_client.get_adressen(bag_id)
            responses = await asyncio.gather(pand_task, vbo_task, addr_task, return_exceptions=True)
            pand_response, vbo_response, addr_response = responses

            if isinstance(pand_response, Exception):
                self._handle_bag_api_exceptions(pand_response, bag_id)
            try:
                pand_response.raise_for_status()
            except httpx.HTTPStatusError as e:
                self._handle_bag_api_exceptions(e, bag_id)

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

            # Address is best-effort — don't fail the whole request if it errors
            address = None
            if not isinstance(addr_response, Exception):
                try:
                    addr_response.raise_for_status()
                    address = self._map_address(addr_response.json())
                except Exception:
                    pass

        # Enrich VBOs with EP-Online labels (parallel, non-blocking on failure)
        enriched_vbo_data = await self._enrich_vbos_with_ep_labels(structured_vbo_data)

        return AggregatedBagResponse(
            bag_id=bag_id,
            address=address,
            pand_data=structured_pand_data,
            verblijfsobject_data=enriched_vbo_data,
        )

    async def fetch_and_aggregate(self, x_coord: float, y_coord: float) -> AggregatedBagResponse:
        """
        Asynchronously fetches and aggregates Pand and VBO data
        by first searching spatially with coordinates, then enriches VBOs
        with EP-Online energy labels.
        """
        coords = [x_coord, y_coord]
        self._structured_pand_data = None

        async with self._api_client_factory() as api_client:
            bag_id = await self._search_pand_and_extract_bag_id(api_client, coords)
            structured_vbo_data = await self._fetch_vbo_data(api_client, bag_id)

        # Enrich VBOs with EP-Online labels (parallel, non-blocking on failure)
        enriched_vbo_data = await self._enrich_vbos_with_ep_labels(structured_vbo_data)

        aggregated_data = {
            "bag_id": bag_id,
            "pand_data": self._structured_pand_data,
            "verblijfsobject_data": enriched_vbo_data,
        }

        del self._structured_pand_data

        return AggregatedBagResponse(**aggregated_data)


def get_metadata_bag3d_service() -> Metadata3DBagService:
    """Factory function for FastAPI dependency injection."""
    mapper = Metadata3DBagMapper()
    return Metadata3DBagService(
        api_client_factory=get_metadata_bag3d_client,
        data_mapper=mapper,
        ep_client_factory=get_ep_online_client,
    )

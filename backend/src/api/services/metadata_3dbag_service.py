import httpx
import asyncio
import json
from fastapi import HTTPException
from src.api.services.metadata_3dbag_client import get_metadata_bag3d_client
from src.api.services.ep_online_client import get_ep_online_client
from src.api.mappers.metadata_3dbag_mapper import Metadata3DBagMapper
from src.api.models.metadata_3dbag_model import (
    AggregatedBagResponse,
    AddressData,
    EnergieLabel,
    PandEnergieData,
    VboData,
)
from src.api.exceptions import MappingError
from typing import Optional, List, Tuple
from config import get_settings

settings = get_settings()


class Metadata3DBagService:
    """
    Fetches and aggregates building data from the Kadaster LVBAG API,
    enriched with per-VBO energy labels and pand-level EP-Online data.
    """

    def __init__(self, api_client_factory, data_mapper, ep_client_factory):
        self._api_client_factory = api_client_factory
        self._mapper = data_mapper
        self._ep_client_factory = ep_client_factory

    # ──────────────────────────────────────────────
    # Exception handling
    # ──────────────────────────────────────────────

    def _handle_bag_api_exceptions(self, e: Exception, bag_identifier: str):
        """Map Kadaster API errors to FastAPI HTTPExceptions."""
        if isinstance(e, httpx.HTTPStatusError):
            status_code = e.response.status_code
            if status_code in (400, 404):
                raise HTTPException(
                    status_code=404,
                    detail=f"BAG data not found or identifier is invalid: {bag_identifier} (Upstream: {status_code})"
                )
            if 400 <= status_code < 500:
                raise HTTPException(
                    status_code=400,
                    detail=f"Upstream client error for {bag_identifier}: {e.response.reason_phrase} (Upstream: {status_code})"
                )
            if status_code >= 500:
                raise HTTPException(
                    status_code=502,
                    detail=f"External BAG API server error (Upstream: {status_code})"
                )
        elif isinstance(e, httpx.RequestError):
            raise HTTPException(status_code=503, detail=f"Failed to connect to external BAG API: {e.__class__.__name__}")
        elif isinstance(e, json.JSONDecodeError):
            raise HTTPException(status_code=500, detail=f"External BAG API returned invalid JSON: {e}")
        else:
            raise HTTPException(status_code=500, detail=f"Unexpected error for {bag_identifier}: {e.__class__.__name__}")

    # ──────────────────────────────────────────────
    # EP-Online enrichment
    # ──────────────────────────────────────────────

    async def _fetch_ep_data_for_vbo(self, ep_client, vbo_id: str) -> Optional[dict]:
        """
        Fetch the most recent EP-Online record for a VBO using a shared client.
        Returns the raw record dict (so we can extract both VBO-level and Pand-level fields),
        or None on any error / missing data.
        """
        try:
            response = await ep_client.get_label_by_vbo(vbo_id)
            if response.status_code != 200:
                return None
            records = response.json()
            if not records:
                return None
            return sorted(records, key=lambda r: r.get("Registratiedatum") or "", reverse=True)[0]
        except Exception:
            return None

    @staticmethod
    def _parse_energie_label(record: dict) -> Optional[EnergieLabel]:
        """Extract per-VBO energy label fields from an EP-Online record."""
        if not record:
            return None
        return EnergieLabel(
            energieklasse=record.get("Energieklasse"),
            energie_index=record.get("Energie_Index"),
            registratiedatum=record.get("Registratiedatum"),
            geldig_tot=record.get("Geldig_tot"),
            energiebehoefte=record.get("Energiebehoefte"),
            primaire_fossiele_energie=record.get("Primaire_fossiele_energie"),
            aandeel_hernieuwbare_energie=record.get("Aandeel_hernieuwbare_energie"),
            warmtebehoefte=record.get("Warmtebehoefte"),
            gebouwklasse=record.get("Gebouwklasse"),
        )

    @staticmethod
    def _parse_pand_energie_data(record: dict) -> Optional[PandEnergieData]:
        """Extract pand-level energy fields from an EP-Online record."""
        if not record:
            return None
        data = PandEnergieData(
            energieklasse=record.get("Pand_energieklasse"),
            gebouwklasse=record.get("Pand_gebouwklasse"),
            gebouwtype=record.get("Pand_gebouwtype"),
            projectnaam=record.get("Pand_projectnaam"),
            energiebehoefte=record.get("Pand_energiebehoefte"),
            eis_energiebehoefte=record.get("Pand_eis_energiebehoefte"),
        )
        # Only return if at least one field is populated
        if any(v is not None for v in data.model_dump().values()):
            return data
        return None

    async def _enrich_vbos_with_ep_labels(
        self, vbos: List[VboData]
    ) -> Tuple[List[VboData], Optional[PandEnergieData]]:
        """
        Fetch EP-Online records for all VBOs in parallel.
        Returns:
          - VBOs enriched with per-VBO energie_label
          - PandEnergieData extracted from the first record that has Pand_ fields
        """
        if not settings.EP_ONLINE_API_KEY:
            return [vbo.model_copy(update={"energie_label": None}) for vbo in vbos], None

        async with self._ep_client_factory() as ep_client:
            ep_tasks = [self._fetch_ep_data_for_vbo(ep_client, vbo.bag_id) for vbo in vbos]
            records = await asyncio.gather(*ep_tasks)

        enriched = []
        pand_energie_data: Optional[PandEnergieData] = None

        for vbo, record in zip(vbos, records):
            label = self._parse_energie_label(record)
            enriched.append(vbo.model_copy(update={"energie_label": label}))
            if pand_energie_data is None and record:
                pand_energie_data = self._parse_pand_energie_data(record)

        return enriched, pand_energie_data

    # ──────────────────────────────────────────────
    # Best-effort address helper
    # ──────────────────────────────────────────────

    @staticmethod
    def _map_address(raw: dict) -> Optional[AddressData]:
        """Extract the building's primary address from the LVBAG /adressen response."""
        try:
            adressen = raw.get("_embedded", {}).get("adressen", [])
            if not adressen:
                return None
            a = adressen[0].get("adres", adressen[0])
            return AddressData(
                street=a.get("openbareRuimteNaam"),
                house_number=a.get("huisnummer"),
                house_letter=a.get("huisletter") or None,
                house_number_addition=a.get("huisnummertoevoeging") or None,
                postcode=a.get("postcode"),
                city=a.get("woonplaatsNaam"),
            )
        except Exception:
            return None

    # ──────────────────────────────────────────────
    # Internal BAG fetch helpers
    # ──────────────────────────────────────────────

    async def _search_pand_and_extract_bag_id(self, api_client, coords: list[float]) -> str:
        """Spatial search for a PAND by RD coordinates; returns its BAG ID."""
        identifier = f"Coords: {coords}"
        try:
            pand_response = await api_client.search_pand_by_coords(coordinates=coords)
            pand_response.raise_for_status()
        except Exception as e:
            self._handle_bag_api_exceptions(e, identifier)

        try:
            pand_data = pand_response.json().get("_embedded", {}).get("panden", [])
        except Exception as e:
            self._handle_bag_api_exceptions(e, identifier)
        if not pand_data:
            raise HTTPException(status_code=404, detail=f"No PAND found at coordinates: {coords}.")

        try:
            self._structured_pand_data = self._mapper.map_pand_data(pand_data[0])
            bag_id = self._structured_pand_data.bag_id
        except MappingError as e:
            raise HTTPException(status_code=500, detail=f"Data structuring failed after spatial search: {str(e)}")

        if not bag_id:
            raise HTTPException(status_code=500, detail="Building found but mapper failed to extract a valid BAG ID.")

        return bag_id

    async def _fetch_vbo_data(self, api_client, bag_id: str) -> List[VboData]:
        """Fetch and map VBO data for a given pand BAG ID."""
        responses = await asyncio.gather(api_client.get_verblijfsobjecten(bag_id), return_exceptions=True)
        vbo_response = responses[0]

        if isinstance(vbo_response, Exception):
            self._handle_bag_api_exceptions(vbo_response, bag_id)
        try:
            vbo_response.raise_for_status()
        except httpx.HTTPStatusError as e:
            self._handle_bag_api_exceptions(e, bag_id)

        try:
            return self._mapper.map_vbo_data(vbo_response.json())
        except json.JSONDecodeError as e:
            self._handle_bag_api_exceptions(e, bag_id)
        except MappingError as e:
            raise HTTPException(status_code=500, detail=f"VBO data structuring failed for {bag_id}: {str(e)}")

    # ──────────────────────────────────────────────
    # Public service methods
    # ──────────────────────────────────────────────

    async def fetch_and_aggregate_by_bag_id(self, bag_id: str) -> AggregatedBagResponse:
        """
        Primary path: fetch PAND, VBOs, and address in parallel by BAG ID,
        then enrich VBOs with EP-Online energy data.
        """
        async with self._api_client_factory() as api_client:
            pand_task = api_client.get_pand(bag_id)
            vbo_task = api_client.get_verblijfsobjecten(bag_id)
            addr_task = api_client.get_adressen(bag_id)
            pand_response, vbo_response, addr_response = await asyncio.gather(
                pand_task, vbo_task, addr_task, return_exceptions=True
            )

            # PAND — required
            if isinstance(pand_response, Exception):
                self._handle_bag_api_exceptions(pand_response, bag_id)
            try:
                pand_response.raise_for_status()
            except httpx.HTTPStatusError as e:
                self._handle_bag_api_exceptions(e, bag_id)

            # VBOs — required
            if isinstance(vbo_response, Exception):
                self._handle_bag_api_exceptions(vbo_response, bag_id)
            try:
                vbo_response.raise_for_status()
            except httpx.HTTPStatusError as e:
                self._handle_bag_api_exceptions(e, bag_id)

            try:
                structured_pand_data = self._mapper.map_pand_data(pand_response.json())
            except json.JSONDecodeError as e:
                self._handle_bag_api_exceptions(e, bag_id)
            except MappingError as e:
                raise HTTPException(status_code=500, detail=f"PAND structuring failed for {bag_id}: {str(e)}")

            try:
                structured_vbo_data = self._mapper.map_vbo_data(vbo_response.json())
            except json.JSONDecodeError as e:
                self._handle_bag_api_exceptions(e, bag_id)
            except MappingError as e:
                raise HTTPException(status_code=500, detail=f"VBO structuring failed for {bag_id}: {str(e)}")

            # Address — best-effort
            building_address = None
            if not isinstance(addr_response, Exception):
                try:
                    addr_response.raise_for_status()
                    building_address = self._map_address(addr_response.json())
                except Exception:
                    pass

        # Enrich VBOs with EP-Online labels + extract pand-level energy data
        enriched_vbo_data, pand_energie_data = await self._enrich_vbos_with_ep_labels(structured_vbo_data)

        return AggregatedBagResponse(
            bag_id=bag_id,
            address=building_address,
            pand_energie_data=pand_energie_data,
            pand_data=structured_pand_data,
            verblijfsobject_data=enriched_vbo_data,
        )

    async def fetch_and_aggregate(self, x_coord: float, y_coord: float) -> AggregatedBagResponse:
        """
        Fallback path: spatial search by RD coordinates to find the BAG ID,
        then aggregates with the same enrichment logic.
        """
        self._structured_pand_data = None
        coords = [x_coord, y_coord]

        async with self._api_client_factory() as api_client:
            bag_id = await self._search_pand_and_extract_bag_id(api_client, coords)
            structured_vbo_data = await self._fetch_vbo_data(api_client, bag_id)

        enriched_vbo_data, pand_energie_data = await self._enrich_vbos_with_ep_labels(structured_vbo_data)

        result = AggregatedBagResponse(
            bag_id=bag_id,
            pand_energie_data=pand_energie_data,
            pand_data=self._structured_pand_data,
            verblijfsobject_data=enriched_vbo_data,
        )
        del self._structured_pand_data
        return result


def get_metadata_bag3d_service() -> Metadata3DBagService:
    """Factory function for FastAPI dependency injection."""
    return Metadata3DBagService(
        api_client_factory=get_metadata_bag3d_client,
        data_mapper=Metadata3DBagMapper(),
        ep_client_factory=get_ep_online_client,
    )

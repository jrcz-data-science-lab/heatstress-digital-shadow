# Backend – Heatstress Digital Shadow

FastAPI backend that serves geospatial data for the Heatstress Digital Shadow frontend.

---

## Setup

### Environment variables

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `BAG_API_KEY` | Yes | Kadaster LVBAG API key — [request via developer portal](https://developer.kadaster.nl/) |
| `BASE_URL` | Yes | LVBAG base URL (default already set in `.env.example`) |
| `EP_ONLINE_API_KEY` | No | EP-Online public API key — [request via ep-online.nl](https://www.ep-online.nl/PublicData) — if omitted, energy label data is skipped |

### Run locally

```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

---

## Architecture

```
src/api/
  models/         # Pydantic request/response models
  services/       # Business logic + external API clients
  mappers/        # Raw JSON → Pydantic model mapping
  routers/        # FastAPI route definitions
  controllers/    # QGIS / session / WMS/WFS logic
  exceptions/     # Custom exception types
```

---

## Buildings feature — data flow

When the frontend clicks a building on the 3D BAG tileset, it reads the `identificatie` (BAG ID) directly from the tile feature and calls `GET /3dbag/pand/{bag_id}`.

The backend then makes **three parallel requests** to the Kadaster LVBAG API:

| Call | Endpoint | Purpose |
|---|---|---|
| Pand | `GET panden/{bag_id}` | Construction year, status, geometry |
| VBOs | `GET verblijfsobjecten?pandIdentificatie={bag_id}&expand=heeftAlsHoofdadres` | All units (apartments) with embedded unit address |
| Address | `GET adressen?pandIdentificatie={bag_id}` | Street name, postcode, city for the building header |

After those resolve, the backend calls **EP-Online** (`public.ep-online.nl/api/v5`) once per VBO in parallel to fetch energy performance certificates. From each certificate record the backend extracts two sets of fields:

- **Per-VBO** (`EnergieLabel`): `Energieklasse`, `Energie_Index`, `Energiebehoefte`, `Primaire_fossiele_energie`, `Aandeel_hernieuwbare_energie`, `Warmtebehoefte`, validity dates.
- **Building-level** (`PandEnergieData`, same value for all VBOs in the same building): `Pand_energieklasse`, `Pand_gebouwklasse`, `Pand_gebouwtype`, `Pand_projectnaam`, `Pand_energiebehoefte`, `Pand_eis_energiebehoefte`.

If `EP_ONLINE_API_KEY` is not set, all energy fields are silently omitted — the rest of the building data still works.

A fallback coordinate-based endpoint (`GET /3dbag/search-pand?x_coord=&y_coord=`) is available when no BAG ID is known.

---

## Key models

| Model | File | Description |
|---|---|---|
| `AggregatedBagResponse` | `metadata_3dbag_model.py` | Full building response returned to frontend |
| `PandData` | `metadata_3dbag_model.py` | BAG pand (building) fields |
| `VboData` | `metadata_3dbag_model.py` | BAG verblijfsobject (unit) fields incl. `adres` and `energie_label` |
| `VboAdres` | `metadata_3dbag_model.py` | Per-unit address (house number / letter / addition) |
| `AddressData` | `metadata_3dbag_model.py` | Building-level street address |
| `EnergieLabel` | `metadata_3dbag_model.py` | Per-VBO EP-Online certificate fields |
| `PandEnergieData` | `metadata_3dbag_model.py` | Building-level EP-Online `Pand_*` fields |

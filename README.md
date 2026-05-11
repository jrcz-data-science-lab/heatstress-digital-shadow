# Heatstress Digital Shadow

A full-stack geospatial application for visualising and analysing urban heat stress in Middelburg, Netherlands. The frontend renders a 3D map (CesiumJS) overlaid with QGIS-generated WMS heat stress layers. The backend serves building metadata from the Dutch BAG/EP-Online APIs.

---

## Services

| Service | Port | Description |
|---|---|---|
| `frontend` | 5173 | React + CesiumJS dev server |
| `backend` | 8000 | FastAPI — BAG / EP-Online / QGIS session API |
| `qgis` | 9000 | QGIS microservice — PET raster computation |
| `nginx` | 8010 | QGIS Server (WMS/WFS via FastCGI) |

---

## Quick start

### 1. Configure the backend

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and fill in your API keys (see [backend/README.md](backend/README.md) for details).

### 2. Start all services

```bash
docker compose up -d
```

The frontend will be available at [http://localhost:5173](http://localhost:5173).

---

## Running the frontend locally (without Docker)

```bash
cd frontend
npm install
npm run dev
```

---

## Sub-project documentation

- [frontend/README.md](frontend/README.md) — Frontend architecture, feature structure, and testing
- [backend/README.md](backend/README.md) — Backend setup, environment variables, and API architecture
- [data/README.md](data/README.md) — Data folder / volume notes

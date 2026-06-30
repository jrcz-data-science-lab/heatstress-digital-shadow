# Heatstress Digital Shadow

A full-stack geospatial application for visualising and analysing urban heat stress in Middelburg, Netherlands. The frontend renders a 3D map (CesiumJS) overlaid with QGIS-generated WMS heat stress layers. The backend serves building metadata from the Dutch BAG/EP-Online APIs.

---

## Services

| Service    | Port | Description                                  |
| ---------- | ---- | -------------------------------------------- |
| `frontend` | 5173 | React + CesiumJS dev server                  |
| `backend`  | 8000 | FastAPI — BAG / EP-Online / QGIS session API |
| `qgis`     | 9000 | QGIS microservice — PET raster computation   |
| `nginx`    | 8010 | QGIS Server (WMS/WFS via FastCGI)            |

---

## Quick start

https://github.com/jrcz-data-science-lab/heatstress-digital-shadow/wiki/1.-Setting-up-the-application

---

## Sub-project documentation

- [frontend/README.md](frontend/README.md) — Frontend architecture, feature structure, and testing
- [backend/README.md](backend/README.md) — Backend setup, environment variables, and API architecture
- [data/README.md](data/README.md) — Data folder / volume notes

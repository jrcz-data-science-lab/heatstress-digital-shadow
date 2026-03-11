# Frontend – Heatstress Digital Shadow

A React + TypeScript frontend using Vite, Cesium for mapping, and Jest for unit testing.

---

## Quick start

```bash
docker compose up -d
```

### Install

```bash
npm install
```

### Develop

```bash
npm run dev
```

Vite serves at [http://localhost:5173](http://localhost:5173) by default.

### Build

```bash
npm run build
```

### Preview build

```bash
npm run preview
```

---

## Testing (Jest)

We use **Jest + babel-jest** to test TypeScript/React code and ESM dependencies like Cesium.

#### Run all tests

```bash
npm test
```

#### Watch mode

```bash
npm run test:watch
```

---

## Scripts

`package.json` provides:

- `dev` – Vite dev server
- `build` – production build
- `preview` – preview the build
- `test` – run Jest once
- `test:watch` – run Jest in watch mode

---

## Project structure (suggested)

```
frontend/
  src/
    map/
      layers/
        osmLayer.ts
        __tests__/osmLayer.test.ts
    setupTests.ts
  test/
    __mocks__/
      fileMock.js
      styleMock.js
  babel.config.cjs
  jest.config.ts
  vite.config.ts
  tsconfig.json
  package.json
  README.md  ← (this file)
```

# Crypto Price WebSocket

Real-time cryptocurrency ticker data from Binance, exposed over **HTTP REST** (latest prices) and a **WebSocket** channel (broadcasts updates to connected clients). Built with **Node.js**, **Express**, and **TypeScript**.

---

## Features

- Streams combined Binance ticker WebSocket (configurable stream URL).
- In-memory store of the latest price per symbol.
- **REST API** under `/api/price` with rate limiting.
- **WebSocket server** on the **same port as HTTP** at path `/ws` (e.g. `ws://localhost:5000/ws`), pushing JSON snapshots of all latest prices.
- Simple **web UI** at `/` for viewing live WebSocket data.

---

## Prerequisites

- **Node.js** 18+ (project uses Node 22 in Docker | local dev works on current LTS).
- **npm** (inbuild with Node).
- Optional: **Docker** for containerized runs.

---

## Environment variables

Create a **`.env`** file in the project root (same folder as `package.json`). The app loads it via `import "dotenv/config"` in `src/app.ts`.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `5000` | HTTP port for Express (REST + static `index.html`). WebSocket uses the **same** port at path `/ws` (no separate WebSocket port env var). |
| `RATE_LIMIT_WINDOW_MS` | No | `60000` | Rate limit window in milliseconds for `/api/price/*`. |
| `RATE_LIMIT_MAX` | No | `4` | Max requests per IP per window for `/api/price/*`. |
| `WS_MAX_CONNECTIONS` | No | `50` | Max concurrent WebSocket clients (enforced in `websocketService`). |
| `BINANCE_TICKER_STREAM` | **Yes** | *(none)* | Full Binance combined stream WebSocket URL. If empty, the Binance client may not connect. |

**CORS:** The API uses `cors()` and allows **all** origins. Restrict origins in production if you need stricter security.

### Sample `.env`

```env
PORT=5000
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=10
WS_MAX_CONNECTIONS=50
BINANCE_TICKER_STREAM=wss://stream.binance.com:9443/stream?streams=btcusdt@ticker/ethusdt@ticker/bnbusdt@ticker
```

**Binance stream URL:** Use Binance’s [combined streams](https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams) format: `wss://stream.binance.com:9443/stream?streams=<stream1>/<stream2>/...`  
Each ticker stream is typically `<symbol_lowercase>@ticker`, e.g. `btcusdt@ticker`.

---

## Getting started (local)

### 1. Install dependencies

```bash
npm ci
```

*(Or `npm install` if you do not rely on the lockfile.)*

### 2. Configure environment

Copy the sample block above into `.env` and adjust values. Ensure `BINANCE_TICKER_STREAM` is set to a valid Binance WebSocket URL.

### 3. Run in development (TypeScript, auto-reload)

```bash
npm run dev
```

The server prints a line like: `Server running on http://localhost:<PORT>`.

### 4. Production run (compile then run Node)

```bash
npm run build
npm start
```

- **Build output:** `dist/app.js` (compiled from `src/`).
- **Start command:** `node dist/app.js`.

### 5. Type-check only (no emit)

```bash
npm run check
```

---

## API reference

Base URL (local): `http://localhost:<PORT>` (default port `5000`).

All price routes are prefixed with **`/api/price`** and are protected by the rate limiter (see env vars).

### `GET /api/price/all`

Returns an **array** of the latest `PriceUpdate` objects for every symbol currently in memory.

**Response:** `200 OK`

```json
[
  {
    "symbol": "BTCUSDT",
    "lastPrice": "66695.15000000",
    "changePercent24h": "-2.088",
    "timestamp": 1775155025308
  },
  {
    "symbol": "ETHUSDT",
    "lastPrice": "2047.67000000",
    "changePercent24h": "-3.802",
    "timestamp": 1775155025308
  },
  {
    "symbol": "BNBUSDT",
    "lastPrice": "580.51000000",
    "changePercent24h": "-5.376",
    "timestamp": 1775155024387
  }
]
```

**Sample request (curl):**

```bash
curl -s http://localhost:5000/api/price/all
```

**Sample request (PowerShell):**

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/price/all" -Method Get
```

---

### `GET /api/price/:symbol`

Returns the latest price for **one** symbol. The symbol must match how Binance sends it (e.g. `BTCUSDT`, `ETHUSDT`).

**Response:** `200 OK`

```json
{
  "symbol": "BTCUSDT",
  "lastPrice": "66707.35000000",
  "changePercent24h": "-2.082",
  "timestamp": 1775155055312
}
```

**Response:** `404 Not Found` (if that symbol is not in memory yet)

```json
{
  "error": "Price not found"
}
```

**Sample requests (curl):**

```bash
curl -s http://localhost:5000/api/price/BTCUSDT
curl -s http://localhost:5000/api/price/ETHUSDT
```

**Sample request (PowerShell):**

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/price/BTCUSDT" -Method Get
```

---

### Rate limiting

When the limit is exceeded, the API responds with **429 Too Many Requests** and a JSON body such as:

```json
{
  "error": "Too many requests, please try again later."
}
```

Tune `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX` in `.env` for local testing.

---

## WebSocket

- **URL (local):** `ws://localhost:<PORT>/ws` (same port as HTTP; with TLS use `wss://`).
- **Protocol:** Plain WebSocket (not Socket.IO). Messages are **JSON text** representing an **array** of `PriceUpdate` objects (same shape as `/api/price/all`), pushed after Binance updates (batched by the internal queue).

The demo page `public/index.html` builds the WebSocket URL from `location` (`ws:` / `wss:` + `location.host` + `/ws`), so it works when the HTML is served from the **same host** as the API (e.g. Render). If the UI is hosted elsewhere (e.g. only on Vercel), point your client to `wss://<your-render-host>/ws` (and use **CORS** + `fetch` to the REST API as needed).

---

## Web UI

Open **`http://localhost:5000/`** in a browser to load `public/index.html`, which connects to **`ws://localhost:5000/ws`** (or the matching `wss://` URL when served over HTTPS) and prints the latest payload.

---

## Docker

The included **`dockerfile`** installs dependencies, runs `npm run build`, prunes dev dependencies, and starts with `npm start` (runs `node dist/app.js`).

### Build image

```bash
docker build -t crypto-price-websocket .
```

### Run container

Map **HTTP** (and WebSocket on the same port), and pass environment variables (`.env` is not copied into the image by default if listed in `.dockerignore`):

```bash
docker run --rm -p 5000:5000 ^
  -e PORT=5000 ^
  -e BINANCE_TICKER_STREAM=wss://stream.binance.com:9443/stream?streams=btcusdt@ticker/ethusdt@ticker/bnbusdt@ticker ^
  -e RATE_LIMIT_MAX=10 ^
  crypto-price-websocket
```

On **Linux/macOS**, use `\` line continuation and `export` or a single `-e` line as preferred.

Then test:

```bash
curl -s http://localhost:5000/api/price/all
```

---

## Deploy on Render (Web Service)

Render runs a **long-running** Node process and exposes **one** public HTTP port (`PORT`), which matches this app (HTTP + WebSocket on the same port).

### 1. Push the repo to GitHub (or GitLab / Bitbucket)

Render deploys from a Git remote.

### 2. Create a Web Service

1. In the [Render dashboard](https://dashboard.render.com), click **New +** → **Web Service**.
2. Connect your repository and select this project.
3. Configure:
   - **Root directory:** repository root (folder containing `package.json`).
   - **Runtime:** **Node**.
   - **Build command:** `npm install && npm run build`
   - **Start command:** `npm start` (runs `node dist/app.js`).
   - **Instance type:** Free or paid (free tier spins down after idle; first request may be slow).

### 3. Environment variables

In **Environment**, add at least:

| Key | Example / notes |
|-----|-----------------|
| `BINANCE_TICKER_STREAM` | Same combined stream URL as in `.env` locally. |
| `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS`, `WS_MAX_CONNECTIONS` | Optional; same meaning as in the table above. |

Render sets **`PORT`** automatically; do not hardcode it.

### 4. Deploy and verify

After deploy, open your service URL (e.g. `https://your-service.onrender.com`):

- **Web UI:** `https://your-service.onrender.com/`
- **REST:** `https://your-service.onrender.com/api/price/all`
- **WebSocket:** `wss://your-service.onrender.com/ws`

Test REST:

```bash
curl -s https://your-service.onrender.com/api/price/all
```

### 5. Vercel frontend + Render backend

- **CORS** is open to all origins, so `fetch("https://your-service.onrender.com/api/price/all", …)` from your Vercel page works without extra env vars.
- For WebSockets from the Vercel page, connect to `wss://your-service.onrender.com/ws` (your static HTML cannot rely on `location.host` for the API host; use a small config or build-time env in the frontend project).

---

## Project layout (overview)

```text
src/
  app.ts                 # Express app, mounts routes, starts Binance + WS + queue
  routes/                # HTTP routes (e.g. price API)
  services/              # Binance client, WebSocket broadcast, queue
  storage/               # In-memory price store
  middleware/            # CORS, rate limiting (and error handling if enabled)
  types/                 # Shared TypeScript types
public/                  # Static assets (index.html)
```

---

## Troubleshooting

| Issue | What to check |
|-------|----------------|
| No prices in API / empty array | Binance stream URL (`BINANCE_TICKER_STREAM`), network/firewall, and server logs for “Connected to Binance service”. |
| WebSocket does not connect from browser | Use `ws://` / `wss://` on the **same host and port** as the site (`/ws`). If the page is on Vercel and API on Render, open `wss://<render-host>/ws` explicitly. |
| CORS / blocked fetch | This app allows all origins; if something still fails, check mixed content (HTTPS page calling HTTP API) or network errors. |
| 429 on REST | Lower `RATE_LIMIT_MAX` or widen `RATE_LIMIT_WINDOW_MS`, or wait for the next window. |
| Docker build/run fails | Docker Desktop running; build context includes `package-lock.json` for reproducible `npm ci`/`npm install`. |



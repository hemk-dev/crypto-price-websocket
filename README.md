# Crypto Price WebSocket

Real-time cryptocurrency ticker data from Binance, exposed over **HTTP REST** (latest prices) and a **WebSocket** channel (broadcasts updates to connected clients). Built with **Node.js**, **Express**, and **TypeScript**.

---

## Features

- Streams combined Binance ticker WebSocket (configurable stream URL).
- In-memory store of the latest price per symbol.
- **REST API** under `/api/price` with rate limiting.
- **WebSocket server** on port `8000` at path `/ws`, pushing JSON snapshots of all latest prices.
- Simple **web UI** at `/` for viewing live WebSocket data.

---

## Prerequisites

- **Node.js** 18+ (project uses Node 22 in Docker; local dev works on current LTS).
- **npm** (comes with Node).
- Optional: **Docker** for containerized runs.

---

## Environment variables

Create a **`.env`** file in the project root (same folder as `package.json`). The app loads it via `import "dotenv/config"` in `src/app.ts`.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `5000` | HTTP port for Express (REST + static `index.html`). |
| `RATE_LIMIT_WINDOW_MS` | No | `60000` | Rate limit window in milliseconds for `/api/price/*`. |
| `RATE_LIMIT_MAX` | No | `4` | Max requests per IP per window for `/api/price/*`. |
| `WS_MAX_CONNECTIONS` | No | `50` | Max concurrent WebSocket clients (enforced in `websocketService`). |
| `BINANCE_TICKER_STREAM` | **Yes** for production | *(none)* | Full Binance combined stream WebSocket URL. If empty, the Binance client may not connect usefully. |

### Sample `.env`

```env
PORT=5000
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=10
WS_MAX_CONNECTIONS=50
BINANCE_TICKER_STREAM=wss://stream.binance.com:9443/stream?streams=btcusdt@ticker/ethusdt@ticker/bnbusdt@ticker
```

**Binance stream URL:** Use Binance’s [combined streams](https://binance-docs.github.io/apidocs/spot/en/#websocket-market-streams) format: `wss://stream.binance.com:9443/stream?streams=<stream1>/<stream2>/...`  
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

### 4. Production-style run (compile then run Node)

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
    "lastPrice": "95000.12",
    "changePercent24h": "1.234",
    "timestamp": 1712000000000
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
  "lastPrice": "95000.12",
  "changePercent24h": "1.234",
  "timestamp": 1712000000000
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

- **URL (local):** `ws://localhost:8000/ws`
- **Protocol:** Plain WebSocket (not Socket.IO). Messages are **JSON text** representing an **array** of `PriceUpdate` objects (same shape as `/api/price/all`), pushed after Binance updates (batched by the internal queue).

Example client (browser) is in `public/index.html`. If you deploy behind another host, change the WebSocket URL from `localhost` to your server hostname and ensure port `8000` is reachable (or put a reverse proxy in front).

---

## Web UI

Open **`http://localhost:5000/`** in a browser to load `public/index.html`, which connects to `ws://localhost:8000/ws` and prints the latest payload.

---

## Docker

The included **`dockerfile`** installs dependencies, runs `npm run build`, prunes dev dependencies, and starts with `npm start` (runs `node dist/app.js`).

### Build image

```bash
docker build -t crypto-price-websocket .
```

### Run container

Map **HTTP** `5000` and **WebSocket** `8000`, and pass environment variables (`.env` is not copied into the image by default if listed in `.dockerignore`):

```bash
docker run --rm -p 5000:5000 -p 8000:8000 ^
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

## Project layout (overview)

```text
src/
  app.ts                 # Express app, mounts routes, starts Binance + WS + queue
  routes/                # HTTP routes (e.g. price API)
  services/              # Binance client, WebSocket broadcast, queue
  storage/               # In-memory price store
  middleware/            # Rate limiting (and error handling if enabled)
  types/                 # Shared TypeScript types
public/                  # Static assets (index.html)
```

---

## Troubleshooting

| Issue | What to check |
|-------|----------------|
| No prices in API / empty array | Binance stream URL (`BINANCE_TICKER_STREAM`), network/firewall, and server logs for “Connected to Binance service”. |
| WebSocket does not connect from browser | Same machine: ports `5000` and `8000` exposed; `index.html` uses `localhost:8000`—update if using another host. |
| 429 on REST | Lower `RATE_LIMIT_MAX` or widen `RATE_LIMIT_WINDOW_MS`, or wait for the next window. |
| Docker build/run fails | Docker Desktop running; build context includes `package-lock.json` for reproducible `npm ci`/`npm install`. |

---

## License

ISC (see `package.json`).

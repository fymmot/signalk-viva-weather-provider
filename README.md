# signalk-viva-weather-provider

Signal K Node Server **Weather Provider** plugin using Sjöfartsverket **Viva**.

## What it supports

- **Observations only** (`/signalk/v2/api/weather/observations?...`) with wind:
  - `wind.speedTrue` (mean wind, m/s)
  - `wind.gust` (gust wind, m/s)
  - `wind.directionTrue` (degrees “from”)

- **No forecasts**: `/forecasts/*` returns `[]`
- **No warnings**: `/warnings` returns `[]`

## Upstream Viva API

- Base URL: `https://services.viva.sjofartsverket.se:8080/output/vivaoutputservice.svc`
- Endpoint: `GET /vivastation/{stationId}`

The plugin bundles a station list (`assets/found_stations.json`), ranks stations by distance to the requested lat/lon, and tries up to N closest stations until it finds a non-stale observation (`Quality` contains “gammalt” → stale).

## Install (local)

```bash
cd /path/to/signalk-server
npm install "/Users/tommyfeldt/git/viva-sk-weather-provider"
```

Enable it in **Server → Plugin Config**.

## Development

```bash
cd /Users/tommyfeldt/git/viva-sk-weather-provider
npm install
npm test
npm run build
node dist/smoke.js
```


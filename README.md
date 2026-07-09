# signalk-viva-weather-provider

A Signal K **weather provider** backed by Sjöfartsverket (Swedish Maritime
Administration) **Viva** marine stations. Once installed, the Signal K **Weather API**
and any app that uses it can show live observations for a position — best coverage in
Swedish coastal and inland waters.

**Observations only** — wind (mean, gust, direction), water level, and water
temperature from the nearest suitable station. Forecast and warning requests return
empty results (Viva provides observations only). For forecasts and warnings, pair this
with a forecast provider such as `signalk-smhi-weather-provider`.

## Requirements

- **Signal K server v2** with the Weather API (server 2.x). The plugin registers
  itself as a weather provider on startup.

## Install

1. **App Store (recommended):** Admin UI → **Appstore → Available**, search
   `signalk-viva-weather-provider`, install, restart the server, then enable it under
   **Server → Plugin Config**.
2. **CLI:** `cd ~/.signalk && npm install signalk-viva-weather-provider`, restart the
   server, then enable it in Plugin Config.

It works out of the box — no configuration is required.

## Using it

Weather-aware Signal K apps pick up the provider automatically. To check it directly,
call the Weather API with a latitude and longitude:

```http
GET /signalk/v2/api/weather/observations?lat=57.67&lon=11.85
```

Running more than one weather provider? Add `&provider=viva-weather-provider` to pick
this one. List installed providers at `GET /signalk/v2/api/weather/_providers`.

**Units:** wind m/s, wind direction degrees true (wind from), water level m, water
temperature K.

## Configuration

All optional — the defaults are fine for most boats.

| Setting | Default | What it does |
|---|---|---|
| **Follow the vessel position** | off | Periodically fetch observations for your current position and publish them on the Signal K stream (context `viva.nearest`), so weather follows the boat. |
| **Update interval** | 60 min | How often to refresh when following the vessel (15 / 30 / 60). |
| **Max weather-station distance** | 250 km | Observations come from the nearest Viva station; beyond this, observations are empty. |
| **Debug logging** | off | Extra detail in the Signal K log. |

## Develop

```bash
npm install
npm test
npm run build
node dist/smoke.js   # quick live check against Viva
```

## Note

Parts of this plugin were written with AI assistance. Reviewed and tested before
release; issues and PRs welcome.

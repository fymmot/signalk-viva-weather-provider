# signalk-viva-weather-provider

Signal K Node Server **weather provider plugin** for the [Signal K Weather API](https://demo.signalk.org/documentation/Developing/REST_APIs/Weather_API.html). It registers a provider that maps Sjöfartsverket **Viva** station data into the server’s weather response schema ([Weather providers](https://demo.signalk.org/documentation/Developing/Plugins/Weather_Providers.html)).

## Capabilities

| Dataset | `/signalk/v2/api/weather/...` | Notes |
|--------|-------------------------------|--------|
| **Observations** | `.../observations` | Marine **Viva** stations; wind mean, gust, and direction |
| **Forecasts** | `.../forecasts/point`, `.../forecasts/daily` | Not available from this source — responses are **empty arrays** |
| **Warnings** | `.../warnings` | Not available — **empty** |

Observation paths populated (when a nearby station has fresh data) include:

- `wind.speedTrue` (mean, m/s)  
- `wind.gust` (m/s)  
- `wind.directionTrue` (degrees true, wind **from**)  

## Data source

- Base URL (default): `https://services.viva.sjofartsverket.se:8080/output/vivaoutputservice.svc`  
- Station payload: `GET /vivastation/{stationId}`  

The plugin ships a station list (`assets/found_stations.json`), ranks by distance to the requested `lat`/`lon`, and tries up to **N** nearest stations until it finds a non-stale observation (treats `Quality` containing “gammalt” as stale).

## Installation

Plugins install into the Signal K **server configuration directory** (default `$HOME/.signalk`). See [Server plugins](https://demo.signalk.org/documentation/Developing/Plugins.html).

### From the App Store (recommended)

Npm package: **`signalk-viva-weather-provider`** (keywords `signalk-node-server-plugin`, `signalk-category-weather`). In the Admin UI: **Appstore** → **Available** → find the package → install → **Restart** the server → **Server → Plugin Config** to enable and configure. Details: [Install Plugins and Webapps](https://demo.signalk.org/documentation/Configuration.html#install-plugins-and-webapps).

The App Store uses `npm install --ignore-scripts`; this package ships a built `dist/` via **`prepack`** before publish. See [Publishing to The AppStore](https://demo.signalk.org/documentation/Developing/Plugins/Publishing_to_The_AppStore.html).

### From the command line

```bash
cd ~/.signalk
npm install signalk-viva-weather-provider
```

Restart Signal K Server, then enable the plugin under **Server → Plugin Config**.

### Local clone or `npm link` (development)

```bash
cd ~/.signalk
npm install /absolute/path/to/viva-sk-weather-provider
```

For iterative work, use **`npm link`**: run `npm link` in the plugin repo, then `npm link signalk-viva-weather-provider` from `~/.signalk`. See [Link your project to Signal K server](https://demo.signalk.org/documentation/Developing/Plugins.html#link-your-project-to-signalk-server).

## Using the Weather API

All routes are rooted at **`/signalk/v2/api/weather`**. Requests must include **`lat`** and **`lon`** (WGS84). Optional **`count`** applies where the API returns lists (see the [Weather API](https://demo.signalk.org/documentation/Developing/REST_APIs/Weather_API.html) examples).

With several providers installed, **`provider`** selects the plugin by its id (this plugin’s id is **`viva-weather-provider`**). List installed providers:

```http
GET /signalk/v2/api/weather/_providers
```

Default routing uses the server’s default provider unless you pass **`provider`**. Set default: `POST /signalk/v2/api/weather/_providers/_default/{id}`.

### Example queries

Replace `localhost:3000` with your server host/port. Use **`&provider=`** when `lat`/`lon` are already in the query string.

**Latest Viva observation (wind) for a position**

```http
GET /signalk/v2/api/weather/observations?lat=57.67&lon=11.85&provider=viva-weather-provider
```

**Forecasts / warnings** still hit the same Weather API paths; this provider returns **no forecast or warning payloads** (empty lists / empty result), which is valid when the upstream service does not supply that dataset.

Example with `curl`:

```bash
curl -sS "http://localhost:3000/signalk/v2/api/weather/observations?lat=57.67&lon=11.85&provider=viva-weather-provider"
```

Response shapes are defined by the server’s Weather API **OpenAPI** description (Admin UI: **Documentation → OpenAPI**).

## Units

Wind fields use **m/s** and **degrees true** (SI-style), consistent with the Weather API expectations for those paths.

## Development

```bash
cd viva-sk-weather-provider
npm install
npm test
npm run build
node dist/smoke.js
```

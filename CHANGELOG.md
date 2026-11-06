# Changelog

## 0.1.1

- Run the shared Signal K plugin CI on every push.
- Add a changelog and App Store screenshots.

No change to the plugin's behaviour.

## 0.1.0

First release.

- Weather provider for Sjöfartsverket Viva stations: wind (mean, gust, direction),
  water level and water temperature from the nearest suitable station.
- Forecast and warning requests return empty results; Viva has observations only.
- Optional polling of the vessel's position, publishing the nearest station's readings
  as `environment.*` deltas in a meteo context of their own.

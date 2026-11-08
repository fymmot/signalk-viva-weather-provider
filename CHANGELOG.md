# Changelog

## Unreleased

- **Breaking for clients that worked around the old output.** `wind.directionTrue` is now
  in radians, as the Signal K Weather API specifies. It was in degrees, so clients that
  follow the spec showed nonsense (297° read as 297 rad, i.e. 97°). The same fix applies
  to `environment.wind.directionTrue` when following the vessel position.
- `date` is now ISO 8601 in UTC (`2026-11-08T10:01:00.000Z`). It was Viva's Swedish local
  time with no zone (`2026-11-08 11:01:00`).
- A Viva sample in a unit other than the expected one (m/s, cm, °C) is dropped instead of
  passed on under the wrong unit.

## 0.1.2

- Add an App Store icon and a readable name ("Viva Weather Provider").

No change to the plugin's behaviour.

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

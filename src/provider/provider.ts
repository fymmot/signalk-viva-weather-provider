import type {
  Position,
  WeatherData,
  WeatherForecastType,
  WeatherProviderMethods,
  WeatherReqParams,
  WeatherWarning
} from '../types'
import type { PluginApp } from '../types'
import type { PluginConfig } from '../config'
import { createHttpClient } from '../http'
import { createAsyncCache } from '../cache'
import { haversineKm, roundCoord } from '../geo'
import { loadWindStations } from './stations'
import { createVivaClient } from './vivaClient'
import type { ParsedStationWind } from './vivaClient'
import { celsiusToKelvin, centimetresToMetres, degToRad } from '../units'

const KM_TO_NM = 0.5399568034557235

/** A Weather API observation plus this provider's `station` extension. */
export type VivaObservation = WeatherData & {
  // Provider-specific extension (not part of the core WeatherData type):
  // lets clients compute accurate distance to the station.
  station: { name: string; position: { latitude: number; longitude: number } }
}

/**
 * Map one Viva reading onto a Signal K Weather API observation, in the API's SI units:
 * `date` ISO 8601 UTC, wind m/s and radians (true, the direction it blows from),
 * water level m, water temperature K.
 */
export function buildObservation(args: {
  parsed: ParsedStationWind
  stationName?: string
  stationCoordinates: { latitude: number; longitude: number }
  distanceKm: number
}): VivaObservation {
  const w = args.parsed
  const stationLabel = args.stationName || w.stationName || 'Viva'

  const descriptionParts = [stationLabel, `${(args.distanceKm * KM_TO_NM).toFixed(1)}NM`]
  if (w.observationQuality) descriptionParts.push(w.observationQuality)

  const data: VivaObservation = {
    date: w.timestamp,
    type: 'observation',
    description: descriptionParts.join(' · '),
    station: {
      name: stationLabel,
      position: {
        latitude: args.stationCoordinates.latitude,
        longitude: args.stationCoordinates.longitude
      }
    },
    wind: {
      ...(typeof w.averageSpeed === 'number' ? { speedTrue: w.averageSpeed } : {}),
      ...(typeof w.directionDeg === 'number' ? { directionTrue: degToRad(w.directionDeg) } : {}),
      ...(typeof w.gustSpeed === 'number' ? { gust: w.gustSpeed } : {})
    }
  }

  if (typeof w.waterLevelCm === 'number' || typeof w.waterTempC === 'number') {
    data.water = {
      ...(typeof w.waterLevelCm === 'number' ? { level: centimetresToMetres(w.waterLevelCm) } : {}),
      ...(typeof w.waterTempC === 'number' ? { temperature: celsiusToKelvin(w.waterTempC) } : {})
    }
  }

  return data
}

export function createVivaProviderMethods(
  app: PluginApp,
  config: PluginConfig
): { methods: WeatherProviderMethods; stop: () => void } {
  const http = createHttpClient(config.network.timeoutMs)
  const viva = createVivaClient({ http, baseUrl: config.viva.baseUrl })
  const stations = loadWindStations()

  const cache = createAsyncCache(config.cache.ttlSecondsObservations)

  const methods: WeatherProviderMethods = {
    async getObservations(position: Position, options?: WeatherReqParams): Promise<WeatherData[]> {
      const key = `viva:obs:${roundCoord(position.latitude, config.cache.keyDecimals)},${roundCoord(
        position.longitude,
        config.cache.keyDecimals
      )}`

      const maxCount = options?.maxCount

      const obs = await cache.getOrSet(key, async () => {
        const ranked = stations
          .map((s) => ({
            station: s,
            distanceKm: haversineKm(position, s.coordinates)
          }))
          .sort((a, b) => a.distanceKm - b.distanceKm)
          .slice(0, Math.max(1, config.viva.maxStationTries))

        if (!ranked.length) return null

        let nearestStale: { w: any; distanceKm: number } | null = null

        for (const r of ranked) {
          if (r.distanceKm > config.observations.maxStationDistanceKm) break
          const parsed = await viva.fetchStationWind(r.station.id).catch(() => null)
          if (!parsed) continue
          const entry = {
            parsed,
            distanceKm: r.distanceKm,
            stationName: r.station.name,
            stationCoordinates: r.station.coordinates
          }
          if (parsed.observationStale) {
            if (!nearestStale) nearestStale = { w: entry, distanceKm: r.distanceKm }
            continue
          }
          return entry
        }

        return nearestStale?.w ?? null
      })

      if (!obs) return []

      const data = buildObservation({
        parsed: obs.parsed as ParsedStationWind,
        stationName: obs.stationName as string,
        stationCoordinates: obs.stationCoordinates as { latitude: number; longitude: number },
        distanceKm: obs.distanceKm as number
      })

      const result = [data]
      if (!maxCount || maxCount <= 1) return result
      return result
    },

    async getForecasts(
      _position: Position,
      _type: WeatherForecastType,
      _options?: WeatherReqParams
    ): Promise<WeatherData[]> {
      return []
    },

    async getWarnings(_position: Position): Promise<WeatherWarning[]> {
      return []
    }
  }

  return {
    methods,
    stop: () => {
      cache.clear()
      if (config.logging.debug) app.debug('[viva-weather-provider] stopped')
    }
  }
}


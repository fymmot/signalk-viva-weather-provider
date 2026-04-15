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

const KM_TO_NM = 0.5399568034557235

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

      const w = obs.parsed as {
        timestamp: string
        direction?: number
        averageSpeed?: number
        gustSpeed?: number
        observationQuality?: string
      }

      const descriptionParts: string[] = []
      const stationLabel =
        (obs.stationName as string) || (obs.parsed.stationName as string) || 'Viva'
      descriptionParts.push(stationLabel)
      descriptionParts.push(`${(obs.distanceKm * KM_TO_NM).toFixed(1)}NM`)
      if (w.observationQuality) descriptionParts.push(w.observationQuality)

      const data: WeatherData = {
        date: w.timestamp || new Date().toISOString(),
        type: 'observation',
        description: descriptionParts.join(' · '),
        // Provider-specific extension (not currently part of the core WeatherData type):
        // lets clients compute accurate distance to the station.
        station: {
          name: stationLabel,
          position: {
            latitude: obs.stationCoordinates.latitude,
            longitude: obs.stationCoordinates.longitude
          }
        } as any,
        wind: {
          ...(typeof w.averageSpeed === 'number' ? { speedTrue: w.averageSpeed } : {}),
          ...(typeof w.direction === 'number' ? { directionTrue: w.direction } : {}),
          ...(typeof w.gustSpeed === 'number' ? { gust: w.gustSpeed } : {})
        }
      }

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


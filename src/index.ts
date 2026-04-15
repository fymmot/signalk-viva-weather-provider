import type { Plugin, WeatherProvider } from '@signalk/server-api'
import { coerceConfig } from './config'
import type { PluginApp, Position, WeatherForecastType, WeatherReqParams } from './types'
import { createVivaProviderMethods } from './provider/provider'

const CONFIG_SCHEMA = {
  type: 'object',
  properties: {
    viva: {
      type: 'object',
      title: 'Viva endpoints',
      properties: {
        baseUrl: {
          type: 'string',
          title: 'Viva base URL',
          default: 'https://services.viva.sjofartsverket.se:8080/output/vivaoutputservice.svc'
        },
        maxStationTries: {
          type: 'number',
          title: 'Max station tries',
          default: 25,
          description: 'Try the nearest N stations until we find non-stale observations.'
        }
      }
    },
    cache: {
      type: 'object',
      title: 'Caching',
      properties: {
        ttlSecondsObservations: { type: 'number', title: 'Observations TTL (s)', default: 60 },
        keyDecimals: {
          type: 'number',
          title: 'Lat/Lon cache key decimals',
          default: 3,
          description: 'Rounding applied to cache keys only (not requests).'
        }
      }
    },
    network: {
      type: 'object',
      title: 'Network',
      properties: {
        timeoutMs: { type: 'number', title: 'HTTP timeout (ms)', default: 8000 }
      }
    },
    observations: {
      type: 'object',
      title: 'Observations',
      properties: {
        maxStationDistanceKm: {
          type: 'number',
          title: 'Max station distance (km)',
          default: 250,
          description: 'If the nearest suitable station is farther away, observations may be empty.'
        }
      }
    },
    logging: {
      type: 'object',
      title: 'Logging',
      properties: {
        debug: { type: 'boolean', title: 'Debug logging', default: false }
      }
    }
  }
}

const CONFIG_UISCHEMA = {
  logging: {
    debug: {
      'ui:widget': 'checkbox',
      'ui:title': 'Debug logging'
    }
  }
}

module.exports = function (app: PluginApp): Plugin {
  let stopProvider: (() => void) | undefined

  const plugin: Plugin = {
    id: 'viva-weather-provider',
    name: 'Viva Weather Provider',
    description: 'Signal K v2 Weather Provider using Sjöfartsverket Viva (observations only).',
    schema: () => CONFIG_SCHEMA,
    uiSchema: () => CONFIG_UISCHEMA,
    start: (settings: unknown) => {
      try {
        if (typeof app.registerWeatherProvider !== 'function') {
          throw new Error('Weather API is not available! Server upgrade required.')
        }

        const config = coerceConfig(settings)
        const { methods, stop } = createVivaProviderMethods(app, config)
        stopProvider = stop

        const weatherProvider: WeatherProvider = {
          name: 'Viva',
          methods: {
            pluginId: plugin.id,
            getObservations: async (position: Position, options?: WeatherReqParams) =>
              methods.getObservations(position, options),
            getForecasts: async (
              position: Position,
              type: WeatherForecastType,
              options?: WeatherReqParams
            ) => methods.getForecasts(position, type, options),
            getWarnings: async (position: Position) => methods.getWarnings(position)
          }
        }

        app.registerWeatherProvider(weatherProvider)
        app.setPluginStatus?.('Started')
        if (config.logging.debug) app.debug(`[${plugin.id}] weather provider registered`)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        app.setPluginError?.(msg)
        app.error(msg)
      }
    },
    stop: () => {
      stopProvider?.()
      stopProvider = undefined
      app.setPluginStatus?.('Stopped')
    }
  }

  return plugin
}


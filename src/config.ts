export const VESSEL_POLL_INTERVAL_MINUTES = [15, 30, 60] as const

export type PluginConfig = {
  viva: {
    baseUrl: string
    maxStationTries: number
  }
  cache: {
    ttlSecondsObservations: number
    keyDecimals: number
  }
  network: {
    timeoutMs: number
  }
  observations: {
    maxStationDistanceKm: number
  }
  logging: {
    debug: boolean
  }
  vesselPoll: {
    enable: boolean
    pollIntervalMinutes: number
  }
}

export const DEFAULT_CONFIG: PluginConfig = {
  viva: {
    baseUrl: 'https://services.viva.sjofartsverket.se:8080/output/vivaoutputservice.svc',
    maxStationTries: 25
  },
  cache: {
    ttlSecondsObservations: 60,
    keyDecimals: 3
  },
  network: {
    timeoutMs: 8000
  },
  observations: {
    maxStationDistanceKm: 250
  },
  logging: {
    debug: false
  },
  vesselPoll: {
    enable: false,
    pollIntervalMinutes: 60
  }
}

export function coerceConfig(raw: unknown): PluginConfig {
  const obj = (raw ?? {}) as Partial<PluginConfig>
  return {
    viva: {
      baseUrl: obj.viva?.baseUrl ?? DEFAULT_CONFIG.viva.baseUrl,
      maxStationTries: obj.viva?.maxStationTries ?? DEFAULT_CONFIG.viva.maxStationTries
    },
    cache: {
      ttlSecondsObservations:
        obj.cache?.ttlSecondsObservations ?? DEFAULT_CONFIG.cache.ttlSecondsObservations,
      keyDecimals: obj.cache?.keyDecimals ?? DEFAULT_CONFIG.cache.keyDecimals
    },
    network: {
      timeoutMs: obj.network?.timeoutMs ?? DEFAULT_CONFIG.network.timeoutMs
    },
    observations: {
      maxStationDistanceKm:
        obj.observations?.maxStationDistanceKm ?? DEFAULT_CONFIG.observations.maxStationDistanceKm
    },
    logging: {
      debug: obj.logging?.debug ?? DEFAULT_CONFIG.logging.debug
    },
    vesselPoll: {
      enable: obj.vesselPoll?.enable ?? DEFAULT_CONFIG.vesselPoll.enable,
      pollIntervalMinutes: coercePollMinutes(obj.vesselPoll?.pollIntervalMinutes)
    }
  }
}

function coercePollMinutes(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (VESSEL_POLL_INTERVAL_MINUTES.includes(n as (typeof VESSEL_POLL_INTERVAL_MINUTES)[number])) {
    return n as (typeof VESSEL_POLL_INTERVAL_MINUTES)[number]
  }
  return DEFAULT_CONFIG.vesselPoll.pollIntervalMinutes
}


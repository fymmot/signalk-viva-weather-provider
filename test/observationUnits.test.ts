import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildObservation, createVivaProviderMethods } from '../src/provider/provider'
import { parseStationWind } from '../src/provider/vivaClient'
import { coerceConfig } from '../src/config'

/**
 * Pins the units of everything this provider emits against the Signal K Weather API, which is
 * SI throughout: wind m/s and radians (true, blowing from), water level m, water temperature K,
 * `date` ISO 8601 UTC. Viva itself reports degrees, cm, °C and zone-less Swedish local time.
 */

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
const DEG = Math.PI / 180

/** Vinga (station 114) as Viva served it on 2026-11-08, trimmed to the fields we read. */
const VINGA = {
  GetSingleStationResult: {
    ID: 114,
    Name: 'Vinga',
    Samples: [
      {
        Name: 'Vattenstånd',
        Value: '-14',
        Heading: 0,
        Unit: 'cm',
        Type: 'level',
        Updated: '2026-11-08 11:09:00',
        Quality: 'Ok'
      },
      {
        Name: 'Byvind',
        Value: 'VNV 2.6',
        Heading: 297,
        Unit: 'm/s',
        Type: 'wind',
        Updated: '2026-11-08 11:01:00',
        Quality: 'Ok'
      },
      {
        Name: 'Medelvind',
        Value: 'VNV 1.4',
        Heading: 297,
        Unit: 'm/s',
        Type: 'wind',
        Updated: '2026-11-08 11:01:00',
        Quality: 'Ok'
      },
      {
        Name: 'Vattentemp',
        Value: '9.3',
        Heading: 0,
        Unit: '°C',
        Type: 'watertemp',
        Updated: '2026-11-08 11:00:00',
        Quality: 'Ok'
      }
    ]
  }
}

const VINGA_POSITION = { latitude: 57.631667, longitude: 11.607583 }

function vingaObservation() {
  const parsed = parseStationWind(VINGA)
  if (!parsed) throw new Error('fixture did not parse')
  return buildObservation({
    parsed,
    stationName: 'Vinga',
    stationCoordinates: VINGA_POSITION,
    distanceKm: 9.26
  })
}

describe('buildObservation units', () => {
  it('sends wind direction in radians, not degrees', () => {
    const obs = vingaObservation()
    // 297° from WNW. Sent as degrees, a radian-reading client shows 297 rad = 97°.
    expect(obs.wind?.directionTrue).toBeCloseTo(297 * DEG, 10)
    expect(obs.wind?.directionTrue).toBeGreaterThanOrEqual(0)
    expect(obs.wind?.directionTrue).toBeLessThan(2 * Math.PI)
  })

  it('sends wind speeds in m/s as Viva reports them', () => {
    const obs = vingaObservation()
    expect(obs.wind?.speedTrue).toBe(1.4)
    expect(obs.wind?.gust).toBe(2.6)
  })

  it('sends water level in metres and water temperature in kelvin', () => {
    const obs = vingaObservation()
    expect(obs.water?.level).toBeCloseTo(-0.14, 10)
    expect(obs.water?.temperature).toBeCloseTo(282.45, 10)
  })

  it('sends date as ISO 8601 UTC, converted from Swedish local time', () => {
    const obs = vingaObservation()
    expect(obs.date).toMatch(ISO_UTC)
    expect(obs.date).toBe('2026-11-08T10:01:00.000Z')
  })

  it('reads a 360° heading as north (0 rad)', () => {
    const parsed = parseStationWind({
      GetSingleStationResult: {
        Name: 'X',
        Samples: [{ Name: 'Medelvind', Value: 'N 5.0', Heading: 360, Unit: 'm/s' }]
      }
    })
    const obs = buildObservation({
      parsed: parsed!,
      stationCoordinates: VINGA_POSITION,
      distanceKm: 0
    })
    expect(obs.wind?.directionTrue).toBeCloseTo(0, 10)
  })

  it('drops a sample whose unit is not the one Viva normally uses', () => {
    const parsed = parseStationWind({
      GetSingleStationResult: {
        Name: 'X',
        Samples: [
          { Name: 'Medelvind', Value: '12', Heading: 90, Unit: 'kn' },
          { Name: 'Vattenstånd', Value: '0.3', Type: 'level', Unit: 'm' },
          { Name: 'Vattentemp', Value: '50', Type: 'watertemp', Unit: '°F' }
        ]
      }
    })
    const obs = buildObservation({
      parsed: parsed!,
      stationCoordinates: VINGA_POSITION,
      distanceKm: 0
    })
    expect(obs.wind?.speedTrue).toBeUndefined()
    expect(obs.water).toBeUndefined()
  })
})

describe('Weather API observations (end to end, Viva stubbed)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns SI units and an ISO UTC date', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(VINGA), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const app = {
      debug: () => {},
      error: () => {},
      getSelfPath: () => null,
      handleMessage: () => {},
      registerWeatherProvider: () => {}
    }
    const { methods, stop } = createVivaProviderMethods(app, coerceConfig({}))
    try {
      const [obs] = await methods.getObservations(VINGA_POSITION, { maxCount: 1 })
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/vivastation\/114$/)

      expect(obs.type).toBe('observation')
      expect(obs.date).toBe('2026-11-08T10:01:00.000Z')
      expect(obs.wind).toEqual({
        speedTrue: 1.4,
        directionTrue: expect.closeTo(297 * DEG, 10),
        gust: 2.6
      })
      expect(obs.water?.level).toBeCloseTo(-0.14, 10)
      expect(obs.water?.temperature).toBeCloseTo(282.45, 10)
    } finally {
      stop()
    }
  })

  it('returns no forecasts or warnings, so there is nothing else to convert', async () => {
    vi.stubGlobal('fetch', vi.fn())
    const app = {
      debug: () => {},
      error: () => {},
      getSelfPath: () => null,
      handleMessage: () => {},
      registerWeatherProvider: () => {}
    }
    const { methods, stop } = createVivaProviderMethods(app, coerceConfig({}))
    try {
      expect(await methods.getForecasts(VINGA_POSITION, 'point')).toEqual([])
      expect(await methods.getForecasts(VINGA_POSITION, 'daily')).toEqual([])
      expect(await methods.getWarnings(VINGA_POSITION)).toEqual([])
    } finally {
      stop()
    }
  })
})

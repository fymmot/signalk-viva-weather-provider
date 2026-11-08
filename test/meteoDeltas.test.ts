import { describe, expect, it, vi } from 'vitest'
import { SKVersion } from '@signalk/server-api'
import { emitObservationMeteoDeltas } from '../src/meteoDeltas'

describe('emitObservationMeteoDeltas', () => {
  it('calls handleMessage with context viva.nearest and v1 wind paths', () => {
    const handleMessage = vi.fn()
    emitObservationMeteoDeltas({
      handleMessage,
      pluginId: 'viva-weather-provider',
      context: 'viva.nearest',
      position: { latitude: 57.6, longitude: 11.8 },
      obs: {
        date: '2026-05-04T12:00:00.000Z',
        type: 'observation',
        wind: { speedTrue: 6.2, directionTrue: (3 * Math.PI) / 2, gust: 10.5 }
      }
    })
    expect(handleMessage).toHaveBeenCalledTimes(1)
    const [, msg, sk] = handleMessage.mock.calls[0]
    expect(sk).toBe(SKVersion.v1)
    expect(msg.context).toBe('viva.nearest')
    const values = msg.updates?.[0]?.values ?? []
    const paths = values.map((v: { path: string }) => v.path)
    expect(paths).toContain('environment.wind.directionTrue')
    // Signal K `environment.*` paths are SI too: the direction passes through in radians.
    const dir = values.find((v: { path: string }) => v.path === 'environment.wind.directionTrue')
    expect(dir?.value).toBeCloseTo((3 * Math.PI) / 2, 10)
    const date = values.find((v: { path: string }) => v.path === 'environment.date')
    expect(date?.value).toBe('2026-05-04T12:00:00.000Z')
  })
})

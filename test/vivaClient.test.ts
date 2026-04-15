import { describe, expect, it } from 'vitest'
import { parseStationWind } from '../src/provider/vivaClient'

describe('parseStationWind', () => {
  it('parses gust/mean wind and stale flag', () => {
    const parsed = parseStationWind({
      GetSingleStationResult: {
        Name: 'Station X',
        Samples: [
          {
            Name: 'Byvind',
            Value: '10.5 m/s',
            Heading: 123,
            Quality: 'Gammalt värde',
            Updated: '2026-04-15T12:00:00.000Z'
          },
          {
            Name: 'Medelvind',
            Value: '6.2 m/s',
            Heading: 120,
            Quality: '',
            Updated: '2026-04-15T12:00:00.000Z'
          }
        ]
      }
    })
    expect(parsed).not.toBeNull()
    expect(parsed?.gustSpeed).toBe(10.5)
    expect(parsed?.averageSpeed).toBe(6.2)
    expect(parsed?.direction).toBe(123)
    expect(parsed?.observationStale).toBe(true)
  })
})


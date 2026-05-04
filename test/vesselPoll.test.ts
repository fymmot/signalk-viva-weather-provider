import { describe, expect, it } from 'vitest'
import { parseNavigationPosition } from '../src/vesselPoll'

describe('parseNavigationPosition', () => {
  it('reads latitude/longitude from getSelfPath-style object', () => {
    expect(
      parseNavigationPosition({
        value: { latitude: 57.6, longitude: 11.8 }
      })
    ).toEqual({ latitude: 57.6, longitude: 11.8 })
  })

  it('returns null when value missing', () => {
    expect(parseNavigationPosition({})).toBeNull()
    expect(parseNavigationPosition(null)).toBeNull()
    expect(parseNavigationPosition({ value: {} })).toBeNull()
  })
})

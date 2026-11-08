import { describe, expect, it } from 'vitest'
import { vivaTimestampToIso } from '../src/vivaTime'

/** What the Signal K Weather API `date` must look like: ISO 8601 in UTC. */
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

describe('vivaTimestampToIso', () => {
  it('reads winter timestamps as CET (UTC+1)', () => {
    // The reading from Skarpö on 2026-11-08 that showed up as a zone-less local time.
    expect(vivaTimestampToIso('2026-11-08 11:01:00')).toBe('2026-11-08T10:01:00.000Z')
  })

  it('reads summer timestamps as CEST (UTC+2)', () => {
    expect(vivaTimestampToIso('2026-07-15 14:22:00')).toBe('2026-07-15T12:22:00.000Z')
  })

  it('accepts a T separator and a missing seconds field', () => {
    expect(vivaTimestampToIso('2026-01-02T00:30')).toBe('2026-01-01T23:30:00.000Z')
  })

  it('takes the summer-time reading in the repeated autumn hour', () => {
    // Clocks go back 03:00 CEST -> 02:00 CET on 2026-10-25, so 02:30 happens twice.
    expect(vivaTimestampToIso('2026-10-25 02:30:00')).toBe('2026-10-25T00:30:00.000Z')
    expect(vivaTimestampToIso('2026-10-25 03:30:00')).toBe('2026-10-25T02:30:00.000Z')
  })

  it('shifts a time in the spring gap forward, as clocks do', () => {
    // Clocks go forward 02:00 CET -> 03:00 CEST on 2026-03-29; 02:30 never happens.
    expect(vivaTimestampToIso('2026-03-29 01:59:00')).toBe('2026-03-29T00:59:00.000Z')
    expect(vivaTimestampToIso('2026-03-29 02:30:00')).toBe('2026-03-29T01:30:00.000Z')
    expect(vivaTimestampToIso('2026-03-29 03:00:00')).toBe('2026-03-29T01:00:00.000Z')
  })

  it('normalises timestamps that already carry a zone', () => {
    expect(vivaTimestampToIso('2026-04-15T12:00:00.000Z')).toBe('2026-04-15T12:00:00.000Z')
    expect(vivaTimestampToIso('2026-04-15T14:00:00+02:00')).toBe('2026-04-15T12:00:00.000Z')
  })

  it('always returns ISO 8601 UTC', () => {
    for (const raw of ['2026-11-08 11:01:00', '2026-06-01 00:00:00', '2026-12-31 23:59:59']) {
      expect(vivaTimestampToIso(raw)).toMatch(ISO_UTC)
    }
  })

  it('returns undefined for missing or unreadable input', () => {
    expect(vivaTimestampToIso(undefined)).toBeUndefined()
    expect(vivaTimestampToIso('')).toBeUndefined()
    expect(vivaTimestampToIso('igår')).toBeUndefined()
    expect(vivaTimestampToIso('08/11/2026 11:01')).toBeUndefined()
  })
})

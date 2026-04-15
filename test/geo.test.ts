import { describe, expect, it } from 'vitest'
import { haversineKm } from '../src/geo'

describe('haversineKm', () => {
  it('is zero for same point', () => {
    expect(haversineKm({ latitude: 1, longitude: 2 }, { latitude: 1, longitude: 2 })).toBe(0)
  })
})


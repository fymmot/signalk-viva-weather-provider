import type { HttpClient } from '../http'
import { vivaTimestampToIso } from '../vivaTime'

type VivaSample = {
  Name?: string
  name?: string
  Value?: string
  Heading?: number
  Quality?: string
  Updated?: string
  Type?: string
  Unit?: string
}

type VivaStationResult = {
  Name?: string
  Samples?: VivaSample[] | VivaSample
  samples?: VivaSample[] | VivaSample
}

type VivaResponseRoot = {
  GetSingleStationResult?: VivaStationResult
}

/**
 * One Viva station reading in Viva's own units. Conversion to Signal K SI units happens in
 * `buildObservation` (provider.ts), so each field's unit is in its name.
 */
export type ParsedStationWind = {
  stationName: string
  /** ISO 8601 UTC; Viva's zone-less Swedish local time already converted. */
  timestamp: string
  /** Compass degrees true, the direction the wind blows from. */
  directionDeg?: number
  averageSpeed?: number
  gustSpeed?: number
  waterLevelCm?: number
  waterTempC?: number
  observationQuality?: string
  observationStale: boolean
}

function sampleName(s: VivaSample): string {
  return (s.Name ?? s.name ?? '').trim()
}

export function parseWindSpeedMps(value: string | undefined): number | undefined {
  const s = (value ?? '').trim()
  if (!s || s === '-') return undefined
  const m = /\d+\.?\d*/.exec(s)
  if (!m) return undefined
  const n = Number(m[0])
  return Number.isFinite(n) ? n : undefined
}

function toArray(samples: VivaStationResult['Samples']): VivaSample[] {
  if (!samples) return []
  if (Array.isArray(samples)) return samples
  return [samples]
}

/**
 * True when the sample is in [expected], or names no unit. A sample in any other unit is
 * dropped rather than passed on under the wrong one.
 */
function hasUnit(s: VivaSample | undefined, expected: string): boolean {
  const unit = (s?.Unit ?? '').trim()
  return !unit || unit.toLowerCase() === expected.toLowerCase()
}

function headingDegrees(s?: VivaSample): number | undefined {
  const h = s?.Heading
  return typeof h === 'number' && Number.isFinite(h) ? h : undefined
}

export function parseStationWind(root: unknown): ParsedStationWind | null {
  const data = (root as VivaResponseRoot | null)?.GetSingleStationResult
  if (!data) return null

  const samples = toArray(data.Samples ?? data.samples)
  if (!samples.length) return null

  const byvind = samples.find((s) => sampleName(s) === 'Byvind')
  const medelvind = samples.find((s) => sampleName(s) === 'Medelvind')
  const levelSample = samples.find((s) => (s.Type ?? '').toLowerCase() === 'level')
  const watertempSample = samples.find((s) => (s.Type ?? '').toLowerCase() === 'watertemp')

  const gustSpeed = hasUnit(byvind, 'm/s') ? parseWindSpeedMps(byvind?.Value) : undefined
  const averageSpeed = hasUnit(medelvind, 'm/s') ? parseWindSpeedMps(medelvind?.Value) : undefined

  const directionDeg =
    (byvind && typeof gustSpeed === 'number' ? headingDegrees(byvind) : undefined) ??
    (medelvind && typeof averageSpeed === 'number' ? headingDegrees(medelvind) : undefined)

  const waterLevelCm =
    levelSample?.Value !== undefined && hasUnit(levelSample, 'cm')
      ? Number(levelSample.Value)
      : undefined
  const waterTempC =
    watertempSample?.Value !== undefined && hasUnit(watertempSample, '°C')
      ? Number(watertempSample.Value)
      : undefined

  let observationQuality: string | undefined
  let observationStale = false
  for (const src of [byvind, medelvind]) {
    if (!src) continue
    const q = (src.Quality ?? '').trim()
    if (q) {
      if (!observationQuality) observationQuality = q
      if (q.toLowerCase().includes('gammalt')) observationStale = true
    }
  }

  const timestamp =
    vivaTimestampToIso(byvind?.Updated) ??
    vivaTimestampToIso(medelvind?.Updated) ??
    vivaTimestampToIso(samples[0]?.Updated) ??
    new Date().toISOString()

  const stationName = (data.Name ?? '').trim()

  return {
    stationName,
    timestamp,
    directionDeg,
    averageSpeed,
    gustSpeed,
    ...(typeof waterLevelCm === 'number' && Number.isFinite(waterLevelCm) ? { waterLevelCm } : {}),
    ...(typeof waterTempC === 'number' && Number.isFinite(waterTempC) ? { waterTempC } : {}),
    observationQuality,
    observationStale
  }
}

export type VivaClient = {
  fetchStationWind: (stationId: number) => Promise<ParsedStationWind | null>
}

export function createVivaClient(args: { http: HttpClient; baseUrl: string }): VivaClient {
  const base = args.baseUrl.replace(/\/+$/, '')
  return {
    async fetchStationWind(stationId: number): Promise<ParsedStationWind | null> {
      const url = `${base}/vivastation/${stationId}`
      const root = await args.http.getJson<unknown>(url, {
        'User-Agent': 'SignalK-Viva-Provider/0.1'
      })
      return parseStationWind(root)
    }
  }
}


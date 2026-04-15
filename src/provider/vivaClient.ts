import type { HttpClient } from '../http'

type VivaSample = {
  Name?: string
  name?: string
  Value?: string
  Heading?: number
  Quality?: string
  Updated?: string
}

type VivaStationResult = {
  Name?: string
  Samples?: VivaSample[] | VivaSample
  samples?: VivaSample[] | VivaSample
}

type VivaResponseRoot = {
  GetSingleStationResult?: VivaStationResult
}

export type ParsedStationWind = {
  stationName: string
  timestamp: string
  direction?: number
  averageSpeed?: number
  gustSpeed?: number
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

  const gustSpeed = parseWindSpeedMps(byvind?.Value)
  const averageSpeed = parseWindSpeedMps(medelvind?.Value)

  const direction =
    (byvind && typeof gustSpeed === 'number' ? headingDegrees(byvind) : undefined) ??
    (medelvind && typeof averageSpeed === 'number' ? headingDegrees(medelvind) : undefined)

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
    (byvind?.Updated ?? '').trim() ||
    (medelvind?.Updated ?? '').trim() ||
    (samples[0]?.Updated ?? '').trim() ||
    new Date().toISOString()

  const stationName = (data.Name ?? '').trim()

  return {
    stationName,
    timestamp,
    direction,
    averageSpeed,
    gustSpeed,
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


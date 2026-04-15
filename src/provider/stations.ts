import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export type WindStation = {
  id: number
  name: string
  coordinates: { latitude: number; longitude: number }
  hasWindSensors?: boolean
}

export function loadWindStations(): WindStation[] {
  // Works when installed as an npm package, because we ship `assets/` in package.json files.
  const p = join(__dirname, '..', '..', 'assets', 'found_stations.json')
  const raw = readFileSync(p, 'utf-8')
  const json = JSON.parse(raw) as { windStations?: WindStation[] }
  return (json.windStations ?? []).filter((s) => typeof s.id === 'number')
}


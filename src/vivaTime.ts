/**
 * Viva stamps samples with Swedish wall-clock time and no zone, e.g. `2026-11-08 11:01:00`
 * (CET in winter, CEST in summer). The Signal K Weather API wants ISO 8601 in UTC.
 */

const VIVA_TIME_ZONE = 'Europe/Stockholm'

const LOCAL_TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/

const HAS_ZONE = /(Z|[+-]\d{2}:?\d{2})$/i

let wallClockFormat: Intl.DateTimeFormat | undefined

function stockholmFormat(): Intl.DateTimeFormat {
  wallClockFormat ??= new Intl.DateTimeFormat('en-GB', {
    timeZone: VIVA_TIME_ZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
  return wallClockFormat
}

/** Stockholm's offset from UTC, in ms, at the instant [utcMs]. */
function stockholmOffsetMs(utcMs: number): number {
  const parts: Record<string, number> = {}
  for (const p of stockholmFormat().formatToParts(new Date(utcMs))) {
    if (p.type !== 'literal') parts[p.type] = Number(p.value)
  }
  const wallAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  )
  return wallAsUtc - Math.floor(utcMs / 1000) * 1000
}

/**
 * Convert a Viva timestamp to ISO 8601 UTC (`2026-11-08T10:01:00.000Z`).
 *
 * Zone-less timestamps are read as Europe/Stockholm wall-clock time. Timestamps that already
 * carry a zone (`Z`, `+01:00`) are only normalised. In the autumn repeated hour the earlier
 * (summer-time) reading wins; a time that does not exist (the spring gap) is shifted forward
 * by the gap, as clocks do. Returns `undefined` for anything that does not parse.
 */
export function vivaTimestampToIso(raw: string | undefined): string | undefined {
  const s = (raw ?? '').trim()
  if (!s) return undefined

  if (HAS_ZONE.test(s)) {
    const ms = Date.parse(s)
    return Number.isFinite(ms) ? new Date(ms).toISOString() : undefined
  }

  const m = LOCAL_TIMESTAMP.exec(s)
  if (!m) return undefined
  const [, y, mo, d, h, mi, sec] = m
  const wallAsUtc = Date.UTC(+y, +mo - 1, +d, +h, +mi, sec ? +sec : 0)
  if (!Number.isFinite(wallAsUtc)) return undefined

  // Try both offsets Stockholm can have near this wall-clock time; keep the earliest instant
  // that reads back as the same wall-clock time.
  const candidates = [
    wallAsUtc - stockholmOffsetMs(wallAsUtc - 12 * 3600_000),
    wallAsUtc - stockholmOffsetMs(wallAsUtc + 12 * 3600_000)
  ].sort((a, b) => a - b)
  const exact = candidates.find((t) => t + stockholmOffsetMs(t) === wallAsUtc)
  const utcMs = exact ?? wallAsUtc - stockholmOffsetMs(wallAsUtc - 12 * 3600_000)
  return new Date(utcMs).toISOString()
}

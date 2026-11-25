// Côte d'Ivoire is UTC+0 all year: event dates are always displayed in the event's timezone.
const TIME_ZONE = 'Africa/Abidjan'

const xof = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })

/** 53000 → "53 000 FCFA" */
export function formatXof(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—'
  return `${xof.format(amount)} FCFA`
}

/** "samedi 20 décembre 2026 à 20:00" */
export function formatEventDate(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIME_ZONE,
  }).format(new Date(iso))
}

/** "20 déc. 2026" */
export function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: TIME_ZONE,
  }).format(new Date(iso))
}

/** ISO date → value of an <input type="datetime-local"> (Abidjan time = UTC). */
export function toDateTimeLocal(iso: string | null): string {
  return iso ? new Date(iso).toISOString().slice(0, 16) : ''
}

export interface Countdown {
  days: number
  hours: number
  minutes: number
  seconds: number
  finished: boolean
}

export function countdownTo(iso: string, now: number = Date.now()): Countdown {
  const diff = Math.max(0, new Date(iso).getTime() - now)
  const totalSeconds = Math.floor(diff / 1000)
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    finished: diff === 0,
  }
}

/** 1000 basis points → "10 %" */
export function formatRate(bp: number | null | undefined): string {
  if (bp === null || bp === undefined) return '—'
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(bp / 100)} %`
}

/** "2026-12-19" → "ven. 19 déc." (calendar date, no timezone shift) */
export function formatStayDate(ymd: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${ymd}T00:00:00Z`))
}

/** "du ven. 19 déc. au dim. 21 déc." */
export function formatStayRange(startsOn: string, endsOn: string): string {
  return `du ${formatStayDate(startsOn)} au ${formatStayDate(endsOn)}`
}

/** Adds days to a Y-m-d date. */
export function addDays(ymd: string, days: number): string {
  const date = new Date(`${ymd}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/** Days between two Y-m-d dates (end − start). */
export function daysBetween(startsOn: string, endsOn: string): number {
  return Math.round(
    (Date.parse(`${endsOn}T00:00:00Z`) - Date.parse(`${startsOn}T00:00:00Z`)) / 86_400_000,
  )
}

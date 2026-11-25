import type { OpeningRange, SessionRules } from '@/types/catalog'

// Côte d'Ivoire is UTC+0 all year: session times are shown in Abidjan time.
const TIME_ZONE = 'Africa/Abidjan'

export const WEEKDAY_LABELS = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche',
]

/** ISO weekday (1 = Monday … 7 = Sunday) of a Y-m-d date. */
export function isoWeekday(ymd: string): number {
  const day = new Date(`${ymd}T00:00:00Z`).getUTCDay()
  return day === 0 ? 7 : day
}

function minutesOf(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return (hours ?? 0) * 60 + (minutes ?? 0)
}

function timeOf(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

/** Opening range of that day, null when the establishment is closed (same rule as the server). */
export function openingOn(
  hours: OpeningRange[],
  closedDates: string[],
  ymd: string,
): OpeningRange | null {
  if (closedDates.includes(ymd)) return null
  return hours.find((range) => range.day === isoWeekday(ymd)) ?? null
}

/** Start times offered that day ("HH:MM"): every step, the session ending before closing time. */
export function sessionSlots(rules: SessionRules, ymd: string): string[] {
  if (!ymd || ymd < rules.available_from || ymd > rules.available_until) return []
  const range = openingOn(rules.opening_hours, rules.closed_dates, ymd)
  if (!range) return []
  const slots: string[] = []
  const closes = minutesOf(range.closes)
  for (
    let start = minutesOf(range.opens);
    start + rules.minutes <= closes;
    start += rules.step_minutes
  ) {
    slots.push(timeOf(start))
  }
  return slots
}

/** First day with at least one slot, from the first bookable day. */
export function firstSessionDay(rules: SessionRules): string | null {
  const day = new Date(`${rules.available_from}T00:00:00Z`)
  for (let i = 0; i < 366; i++) {
    const ymd = day.toISOString().slice(0, 10)
    if (ymd > rules.available_until) return null
    if (sessionSlots(rules, ymd).length) return ymd
    day.setUTCDate(day.getUTCDate() + 1)
  }
  return null
}

/** "jeudi 12 novembre à 15:00" */
export function formatSessionDate(iso: string): string {
  const date = new Date(iso)
  const day = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: TIME_ZONE,
  }).format(date)
  const time = new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIME_ZONE,
  }).format(date)
  return `${day} à ${time}`
}

/** "Jeu. 10:00 – 20:00 · Ven. 10:00 – 20:00" style lines, one per open weekday. */
export function openingLines(hours: OpeningRange[]): { label: string; range: string }[] {
  return [...hours]
    .sort((a, b) => a.day - b.day)
    .map((range) => ({
      label: WEEKDAY_LABELS[range.day - 1] ?? '',
      range: `${range.opens} – ${range.closes}`,
    }))
}

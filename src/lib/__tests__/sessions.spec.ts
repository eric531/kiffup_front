import { describe, expect, it } from 'vitest'
import { firstSessionDay, isoWeekday, sessionSlots } from '@/lib/sessions'
import type { SessionRules } from '@/types/catalog'

// Open Thursday to Sunday, 10:00 – 20:00; 60 min sessions; closed on Saturday 14/11/2026.
const rules: SessionRules = {
  minutes: 60,
  step_minutes: 30,
  available_from: '2026-11-10',
  available_until: '2027-01-08',
  opening_hours: [4, 5, 6, 7].map((day) => ({ day, opens: '10:00', closes: '20:00' })),
  closed_dates: ['2026-11-14'],
}

describe('sessions', () => {
  it('gives the ISO weekday of a date', () => {
    expect(isoWeekday('2026-11-09')).toBe(1)
    expect(isoWeekday('2026-11-15')).toBe(7)
  })

  it('offers a slot every 30 minutes, the session ending before closing time', () => {
    const slots = sessionSlots(rules, '2026-11-12')
    expect(slots[0]).toBe('10:00')
    expect(slots[slots.length - 1]).toBe('19:00')
    expect(slots).toHaveLength(19)
  })

  it('offers nothing on closed days or outside the window', () => {
    expect(sessionSlots(rules, '2026-11-10')).toEqual([])
    expect(sessionSlots(rules, '2026-11-14')).toEqual([])
    expect(sessionSlots(rules, '2027-01-14')).toEqual([])
  })

  it('finds the first day with a slot', () => {
    expect(firstSessionDay(rules)).toBe('2026-11-12')
  })
})

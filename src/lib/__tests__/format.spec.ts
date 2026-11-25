import { describe, expect, it } from 'vitest'
import { countdownTo, formatRate, formatXof, toDateTimeLocal } from '@/lib/format'

describe('format', () => {
  it('affiche les montants en FCFA sans décimales', () => {
    expect(formatXof(53_000).replace(/\s/g, ' ')).toBe('53 000 FCFA')
    expect(formatXof(null)).toBe('—')
  })

  it('calcule le compte à rebours', () => {
    const now = Date.parse('2026-12-18T18:30:00Z')
    expect(countdownTo('2026-12-20T20:00:00Z', now)).toEqual({
      days: 2,
      hours: 1,
      minutes: 30,
      seconds: 0,
      finished: false,
    })
    expect(countdownTo('2026-12-01T00:00:00Z', now).finished).toBe(true)
  })

  it('convertit une date ISO pour un champ datetime-local', () => {
    expect(toDateTimeLocal('2026-12-20T20:00:00+00:00')).toBe('2026-12-20T20:00')
    expect(toDateTimeLocal(null)).toBe('')
  })

  it('affiche un taux en points de base comme un pourcentage', () => {
    expect(formatRate(600).replace(/\s/g, ' ')).toBe('6 %')
    expect(formatRate(1250).replace(/\s/g, ' ')).toBe('12,5 %')
  })
})

export type SettingUnit =
  | 'bp'
  | 'days'
  | 'hours'
  | 'hour'
  | 'minutes'
  | 'seconds'
  | 'units'
  | 'count'
  | 'mb'
  | 'tiers'
  | 'xof'
  | 'bool'

export interface Setting {
  key: string
  group:
    | 'pricing'
    | 'cancellation'
    | 'ledger'
    | 'booking'
    | 'sessions'
    | 'notifications'
    | 'discovery'
    | 'messaging'
  label: string
  help: string
  unit: SettingUnit
  value: unknown
  default: unknown
}

export interface SettingChange {
  id: number
  key: string
  label: string
  old_value: unknown
  new_value: unknown
  changed_by: string | null
  created_at: string
}

export const SETTING_GROUP_LABELS: Record<Setting['group'], string> = {
  pricing: 'Prix et commission',
  cancellation: 'Annulation',
  ledger: 'Soldes partenaires',
  booking: 'Réservation',
  sessions: 'Séances (massage, soins…)',
  notifications: 'Notifications',
  discovery: 'Découvrir (vidéos)',
  messaging: 'Messagerie',
}

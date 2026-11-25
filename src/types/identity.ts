export type Role = 'super_admin' | 'admin' | 'partner' | 'customer'

export interface User {
  id: number
  name: string
  /** Null for a customer account without email (login by phone). */
  email: string | null
  phone: string | null
  is_active: boolean
  roles: Role[]
  two_factor_enabled: boolean
  two_factor_required: boolean
  last_login_at: string | null
  created_at: string | null
}

export interface Resource<T> {
  data: T
}

export interface Paginated<T> {
  data: T[]
  meta: { current_page: number; last_page: number; per_page: number; total: number }
}

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super administrateur',
  admin: 'Administrateur',
  partner: 'Partenaire',
  customer: 'Client',
}

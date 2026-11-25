import { ref } from 'vue'
import { api } from '@/lib/api'
import type { Partner } from '@/types/catalog'

// The logged-in partner's profile, loaded once per visit of the partner area.
const partner = ref<Partner | null>(null)
let pending: Promise<Partner | null> | null = null

/** Vitrine partners (V3) only publish videos: the partner area hides bookings and balance. */
export function usePartnerProfile() {
  function load(): Promise<Partner | null> {
    pending ??= api
      .get<{ data: Partner }>('/api/v1/partner/profile')
      .then((response) => (partner.value = response.data))
      .catch(() => {
        pending = null
        return null
      })
    return pending
  }

  function forget() {
    partner.value = null
    pending = null
  }

  return { partner, load, forget }
}

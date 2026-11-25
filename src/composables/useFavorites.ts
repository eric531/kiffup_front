import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import type { Listing } from '@/types/catalog'

// Shared by every heart on the page: the list is loaded once per logged-in customer.
const ids = ref(new Set<number>())
let loadedFor: number | null = null
let pending: Promise<void> | null = null

/** Listings saved by the logged-in customer (V3). Visitors are sent to the login first. */
export function useFavorites() {
  const auth = useAuthStore()
  const router = useRouter()
  const route = useRoute()

  function ensureLoaded(): Promise<void> {
    const userId = auth.isCustomer ? (auth.user?.id ?? null) : null
    if (userId === null) {
      ids.value = new Set()
      loadedFor = null
      return Promise.resolve()
    }
    if (loadedFor === userId && pending) return pending
    loadedFor = userId
    pending = api
      .get<{ data: Listing[] }>('/api/v1/customer/favorites/listings')
      .then((response) => {
        ids.value = new Set(response.data.map((listing) => listing.id))
      })
      .catch(() => {
        loadedFor = null
        pending = null
      })
    return pending
  }

  const isFavorite = (listingId: number) => computed(() => ids.value.has(listingId))

  async function toggle(listingId: number): Promise<void> {
    if (!auth.isCustomer) {
      await router.push({ name: 'customer-login', query: { redirect: route.fullPath } })
      return
    }
    const saved = ids.value.has(listingId)
    // Optimistic: the heart changes at once, and comes back if the request fails.
    const next = new Set(ids.value)
    if (saved) next.delete(listingId)
    else next.add(listingId)
    ids.value = next
    try {
      if (saved) await api.delete(`/api/v1/customer/favorites/listings/${listingId}`)
      else await api.put(`/api/v1/customer/favorites/listings/${listingId}`)
    } catch {
      const back = new Set(ids.value)
      if (saved) back.add(listingId)
      else back.delete(listingId)
      ids.value = back
    }
  }

  /** The full list was just loaded elsewhere ("Mes favoris"): no second request. */
  function seed(listings: Listing[]) {
    if (!auth.isCustomer || !auth.user) return
    ids.value = new Set(listings.map((listing) => listing.id))
    loadedFor = auth.user.id
    pending = Promise.resolve()
  }

  return { ensureLoaded, isFavorite, toggle, seed }
}

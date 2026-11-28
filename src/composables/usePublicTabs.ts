import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { CalendarCheck, Clapperboard, House, MessagesSquare, UserRound } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useMessagingStore } from '@/stores/messaging'
import type { NavItem } from '@/types/navigation'

/**
 * Public site on a phone: the main destinations in the bottom tab bar, as in a mobile app
 * (public layout and the full-screen "Découvrir" feed).
 */
export function usePublicTabs() {
  const auth = useAuthStore()
  const messaging = useMessagingStore()

  // Visitors and customers: the customer account; partners and staff: their area.
  const accountLink = computed<{ to: RouteLocationRaw; label: string }>(() => {
    if (auth.isCustomer) return { to: { name: 'account' }, label: 'Mon compte' }
    if (auth.isAuthenticated) return { to: auth.homeRoute, label: 'Mon espace' }
    return { to: { name: 'customer-login' }, label: 'Se connecter' }
  })

  const tabs = computed<NavItem[]>(() => [
    { label: 'Accueil', to: { name: 'home' }, icon: House },
    { label: 'Découvrir', to: { name: 'discover' }, icon: Clapperboard, prefix: true },
    { label: 'Réserver', to: { name: 'stays' }, icon: CalendarCheck, prefix: true },
    ...(auth.isCustomer
      ? [
          {
            label: 'Messages',
            to: { name: 'customer.messages' },
            icon: MessagesSquare,
            badge: messaging.unread,
            prefix: true,
          },
        ]
      : []),
    { label: accountLink.value.label, short: 'Compte', to: accountLink.value.to, icon: UserRound },
  ])

  return { tabs, accountLink }
}

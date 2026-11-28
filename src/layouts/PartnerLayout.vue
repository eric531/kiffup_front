<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Clapperboard,
  Clock3,
  Crown,
  LayoutDashboard,
  MessagesSquare,
  Package,
  ReceiptText,
  ScanLine,
  Store,
  Wallet,
} from 'lucide-vue-next'
import AppShell from '@/components/AppShell.vue'
import { usePartnerProfile } from '@/composables/usePartnerProfile'
import { useAuthStore } from '@/stores/auth'
import { useMessagingStore } from '@/stores/messaging'
import type { NavItem } from '@/types/navigation'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { partner, load, forget } = usePartnerProfile()
const messaging = useMessagingStore()
// Messaging (lot F9): unread badge and real time for every account of the partner.
watch(
  () => partner.value?.id,
  (id) => {
    if (id) messaging.start('partner', id)
  },
  { immediate: true },
)
const messagesItem = computed<NavItem>(() => ({
  label: 'Messages',
  to: { name: 'partner.messages' },
  icon: MessagesSquare,
  badge: messaging.unread,
  prefix: true,
}))

// Vitrine partner (V3): videos only, nothing to book, no balance.
const showcase = computed(() => partner.value?.profile === 'showcase')
const BOOKING_PAGES = [
  'partner.dashboard',
  'partner.bookings',
  'partner.check-in',
  'partner.balance',
  'partner.hours',
  'partner.listings',
  'partner.listings.create',
  'partner.listings.edit',
]

const items = computed<NavItem[]>(() =>
  showcase.value
    ? [
        messagesItem.value,
        { label: 'Mes vidéos', to: { name: 'partner.videos' }, icon: Clapperboard },
        { label: 'À la une', to: { name: 'partner.spotlight' }, icon: Crown },
        { label: 'Ma fiche', to: { name: 'partner.profile' }, icon: Store },
      ]
    : [
        { label: 'Tableau de bord', to: { name: 'partner.dashboard' }, icon: LayoutDashboard },
        { label: 'Réservations', to: { name: 'partner.bookings' }, icon: ReceiptText },
        messagesItem.value,
        { label: 'Mes offres', to: { name: 'partner.listings' }, icon: Package },
        { label: 'Arrivées (scanner)', to: { name: 'partner.check-in' }, icon: ScanLine },
        { label: 'Mon solde', to: { name: 'partner.balance' }, icon: Wallet },
        { label: 'Ma fiche', to: { name: 'partner.profile' }, icon: Store },
        { label: 'Mes horaires', to: { name: 'partner.hours' }, icon: Clock3 },
        { label: 'Mes vidéos', to: { name: 'partner.videos' }, icon: Clapperboard },
        { label: 'À la une', to: { name: 'partner.spotlight' }, icon: Crown },
      ],
)

watch(
  () => auth.user?.id,
  () => {
    forget()
    load()
  },
  { immediate: true },
)
watch(
  [showcase, () => route.name],
  ([isShowcase, name]) => {
    if (isShowcase && BOOKING_PAGES.includes(String(name)))
      router.replace({ name: 'partner.videos' })
  },
  { immediate: true },
)
</script>

<template>
  <AppShell area="Partenaire" :items="items" />
</template>

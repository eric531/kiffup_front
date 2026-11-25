<script setup lang="ts">
import { computed } from 'vue'
import {
  Banknote,
  CalendarDays,
  Clapperboard,
  Flag,
  Handshake,
  LayoutDashboard,
  Package,
  ReceiptText,
  ScrollText,
  Settings,
  UserPlus,
  UsersRound,
} from 'lucide-vue-next'
import AppShell from '@/components/AppShell.vue'
import type { NavItem } from '@/types/navigation'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

const items = computed<NavItem[]>(() => [
  { label: 'Tableau de bord', to: { name: 'admin.dashboard' }, icon: LayoutDashboard },
  { label: 'Réservations', to: { name: 'admin.bookings' }, icon: ReceiptText },
  { label: 'Retraits', to: { name: 'admin.withdrawals' }, icon: Banknote },
  { label: 'Événements', to: { name: 'admin.events' }, icon: CalendarDays },
  { label: 'Partenaires', to: { name: 'admin.partners' }, icon: Handshake },
  { label: 'Offres', to: { name: 'admin.listings' }, icon: Package },
  { label: 'Modération vidéos', to: { name: 'admin.moderation' }, icon: Clapperboard },
  { label: 'Messages signalés', to: { name: 'admin.message-reports' }, icon: Flag },
  { label: 'Demandes partenaires', to: { name: 'admin.partner-requests' }, icon: UserPlus },
  ...(auth.isSuperAdmin
    ? [
        { label: 'Paramètres', to: { name: 'admin.settings' }, icon: Settings },
        { label: "Journal d'audit", to: { name: 'admin.audit' }, icon: ScrollText },
        { label: 'Comptes administrateurs', to: { name: 'admin.staff-users' }, icon: UsersRound },
      ]
    : []),
])
</script>

<template>
  <AppShell area="Back-office" :items="items" />
</template>

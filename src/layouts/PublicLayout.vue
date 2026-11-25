<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, type RouteLocationRaw } from 'vue-router'
import { Menu, MessagesSquare, X, UserRound, WifiOff } from 'lucide-vue-next'
import BrandLogo from '@/components/BrandLogo.vue'
import PaymentLogo from '@/components/PaymentLogo.vue'
import { useAuthStore } from '@/stores/auth'
import { useMessagingStore } from '@/stores/messaging'

const auth = useAuthStore()
// Messaging (lot F9): unread badge (started in App.vue, on every page).
const messaging = useMessagingStore()
const route = useRoute()
const scrolled = ref(false)
const menuOpen = ref(false)

const onScroll = () => (scrolled.value = window.scrollY > 24)
onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
watch(
  () => route.fullPath,
  () => (menuOpen.value = false),
)

const links: { label: string; to: RouteLocationRaw }[] = [
  { label: 'Événements', to: { name: 'home', hash: '#evenements' } },
  { label: 'Réserver', to: { name: 'stays' } },
  { label: 'Découvrir', to: { name: 'discover' } },
  { label: 'Devenir partenaire', to: { name: 'become-partner' } },
]
const year = new Date().getFullYear()
const WALLETS = [
  { code: 'wave', label: 'Wave' },
  { code: 'orange', label: 'Orange Money' },
  { code: 'mtn', label: 'MTN MoMo' },
  { code: 'moov', label: 'Moov Money' },
  { code: 'djamo', label: 'Djamo' },
]

// Visitors and customers: the customer account; partners and staff: their area.
const accountLink = computed<{ to: RouteLocationRaw; label: string }>(() => {
  if (auth.isCustomer) return { to: { name: 'account' }, label: 'Mon compte' }
  if (auth.isAuthenticated) return { to: auth.homeRoute, label: 'Mon espace' }
  return { to: { name: 'customer-login' }, label: 'Se connecter' }
})
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <!-- Header: transparent over the dark hero, frosted night glass once scrolled -->
    <header
      class="fixed inset-x-0 top-0 z-50 transition duration-300"
      :class="
        scrolled || menuOpen || route.meta.solidHeader
          ? 'border-b border-white/10 bg-night-950/80 backdrop-blur-xl'
          : 'bg-transparent'
      "
    >
      <div class="container-page flex h-16 items-center justify-between">
        <RouterLink :to="{ name: 'home' }" aria-label="KiffUp, accueil">
          <BrandLogo />
        </RouterLink>

        <nav class="hidden items-center gap-1 text-sm font-medium text-white/80 md:flex">
          <RouterLink
            v-for="link in links"
            :key="link.label"
            :to="link.to"
            class="rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white"
          >
            {{ link.label }}
          </RouterLink>
          <RouterLink
            v-if="auth.isCustomer"
            :to="{ name: 'customer.messages' }"
            class="relative ml-1 grid size-10 place-items-center rounded-full transition hover:bg-white/10 hover:text-white"
            aria-label="Mes messages"
            title="Mes messages"
          >
            <MessagesSquare class="size-5" />
            <span
              v-if="messaging.unread"
              class="absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full bg-flare-500 px-1 text-[11px] font-bold text-white"
            >
              {{ messaging.unread }}
            </span>
          </RouterLink>
          <RouterLink :to="accountLink.to" class="btn-glass ml-2 py-2">
            <UserRound class="size-4" />
            {{ accountLink.label }}
          </RouterLink>
        </nav>

        <RouterLink
          v-if="auth.isCustomer"
          :to="{ name: 'customer.messages' }"
          class="relative ml-auto mr-1 grid size-10 place-items-center rounded-full text-white transition hover:bg-white/10 md:hidden"
          aria-label="Mes messages"
        >
          <MessagesSquare class="size-5" />
          <span
            v-if="messaging.unread"
            class="absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full bg-flare-500 px-1 text-[11px] font-bold"
          >
            {{ messaging.unread }}
          </span>
        </RouterLink>
        <button
          class="grid size-10 place-items-center rounded-full text-white transition hover:bg-white/10 md:hidden"
          :aria-expanded="menuOpen"
          aria-label="Menu"
          @click="menuOpen = !menuOpen"
        >
          <X v-if="menuOpen" class="size-6" />
          <Menu v-else class="size-6" />
        </button>
      </div>

      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="-translate-y-2 opacity-0"
        leave-active-class="transition duration-150 ease-in"
        leave-to-class="-translate-y-2 opacity-0"
      >
        <nav v-if="menuOpen" class="container-page flex flex-col gap-1 pb-5 text-white md:hidden">
          <RouterLink
            v-for="link in links"
            :key="link.label"
            :to="link.to"
            class="rounded-2xl px-4 py-3 hover:bg-white/10"
          >
            {{ link.label }}
          </RouterLink>
          <RouterLink :to="accountLink.to" class="btn-light mt-2">
            {{ accountLink.label }}
          </RouterLink>
        </nav>
      </Transition>
    </header>

    <div
      v-if="auth.apiUnavailable"
      class="fixed inset-x-0 top-16 z-40 flex items-center justify-center gap-2 bg-amber-400 px-4 py-2 text-sm font-medium text-night-900"
    >
      <WifiOff class="size-4" /> Le serveur ne répond pas pour le moment. Certaines fonctions sont
      indisponibles.
    </div>

    <main class="flex-1">
      <RouterView v-slot="{ Component, route: r }">
        <Transition name="page" mode="out-in">
          <component :is="Component" :key="r.meta.shellKey ?? r.path" />
        </Transition>
      </RouterView>
    </main>

    <!-- Footer -->
    <footer
      v-if="!route.meta.hideFooter"
      class="relative overflow-hidden bg-night-950 text-white/70"
    >
      <div
        class="pointer-events-none absolute -top-40 left-1/2 h-80 w-[50rem] -translate-x-1/2 rounded-full bg-dusk-600/20 blur-3xl"
      />
      <div class="container-page relative grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div class="space-y-4 lg:col-span-2">
          <BrandLogo />
          <p class="max-w-sm text-sm leading-relaxed">
            Concerts, nuits, massages : tout ce que tu kiffes, réservé en 2 minutes. Découvre les
            lieux en vidéo, paie avec ton mobile, reçois ta confirmation sur WhatsApp.
          </p>
          <div class="flex flex-wrap gap-2 text-xs">
            <span
              v-for="m in WALLETS"
              :key="m.code"
              class="chip gap-1.5 border border-white/10 bg-white/5 py-1 pl-1 text-white/80"
            >
              <PaymentLogo :code="m.code" size="sm" />
              {{ m.label }}
            </span>
          </div>
        </div>
        <div class="space-y-3 text-sm">
          <p class="font-display font-semibold text-white">KiffUp</p>
          <RouterLink :to="{ name: 'home', hash: '#evenements' }" class="block hover:text-white">
            Événements
          </RouterLink>
          <RouterLink :to="{ name: 'stays' }" class="block hover:text-white"> Réserver </RouterLink>
          <RouterLink :to="{ name: 'discover' }" class="block hover:text-white">
            Découvrir
          </RouterLink>
          <RouterLink
            :to="{ name: 'home', hash: '#comment-ca-marche' }"
            class="block hover:text-white"
          >
            Comment ça marche
          </RouterLink>
          <RouterLink :to="{ name: 'home', hash: '#faq' }" class="block hover:text-white">
            Questions fréquentes
          </RouterLink>
        </div>
        <div class="space-y-3 text-sm">
          <p class="font-display font-semibold text-white">Partenaires</p>
          <RouterLink :to="{ name: 'become-partner' }" class="block hover:text-white">
            Devenir partenaire
          </RouterLink>
          <RouterLink :to="{ name: 'login' }" class="block hover:text-white">
            Espace partenaire
          </RouterLink>
        </div>
      </div>
      <div class="border-t border-white/10">
        <div class="container-page flex flex-col gap-2 py-5 text-xs sm:flex-row sm:justify-between">
          <p>© {{ year }} KiffUp. Tous droits réservés.</p>
          <p>Fait avec ♥ à Abidjan</p>
        </div>
      </div>
    </footer>
  </div>
</template>

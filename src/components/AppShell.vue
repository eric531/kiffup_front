<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ExternalLink, LogOut, ShieldCheck, Smartphone, X } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useInstallApp } from '@/composables/useInstallApp'
import BrandLogo from '@/components/BrandLogo.vue'
import MobileTabBar from '@/components/MobileTabBar.vue'
import type { NavItem } from '@/types/navigation'

/**
 * Partner area and back-office. Computer: sidebar. Phone and tablet: compact title bar, the main
 * destinations in a bottom tab bar (items marked "tab"), the others in a "Plus" sheet — as in an app.
 */
const props = defineProps<{ area: string; items: NavItem[] }>()

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const moreOpen = ref(false)
// Installed app (PWA): offered in the "Plus" sheet.
const installApp = useInstallApp()
const iosInstallHint = ref(false)

const tabs = computed(() => {
  const marked = props.items.filter((item) => item.tab)
  return (marked.length ? marked : props.items).slice(0, 4)
})
const others = computed(() => props.items.filter((item) => !tabs.value.includes(item)))
const othersBadge = computed(() => others.value.reduce((sum, item) => sum + (item.badge ?? 0), 0))

const initials = computed(() =>
  (auth.user?.name ?? '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join(''),
)

watch(
  () => route.fullPath,
  () => (moreOpen.value = false),
)

const active = (item: NavItem, href: string, exact: boolean) =>
  item.prefix ? route.path.startsWith(href) : exact

async function logout() {
  await auth.logout()
  await router.push({ name: 'login' })
}
</script>

<template>
  <div
    class="tabbar-until-lg min-h-dvh bg-surface lg:flex"
    :style="route.meta.hideTabBar ? { '--tabbar': '0px' } : undefined"
  >
    <!-- Phone and tablet: compact title bar -->
    <header
      class="sticky top-0 z-30 bg-night-950 pt-[env(safe-area-inset-top)] text-white lg:hidden"
    >
      <div class="flex h-14 items-center gap-3 px-4">
        <RouterLink :to="tabs[0]?.to ?? { name: 'home' }" aria-label="Accueil de l’espace">
          <BrandLogo />
        </RouterLink>
        <span class="min-w-0 flex-1 truncate text-right text-sm font-semibold text-white/80">
          {{ area }}
        </span>
      </div>
    </header>

    <!-- Computer: sidebar -->
    <aside
      class="relative hidden w-64 shrink-0 flex-col overflow-hidden bg-night-950 text-white lg:sticky lg:top-0 lg:flex lg:h-dvh"
    >
      <!-- Glow -->
      <div
        class="pointer-events-none absolute -top-24 -left-20 size-64 rounded-full bg-flare-500/25 blur-3xl"
      />
      <div
        class="pointer-events-none absolute -right-24 -bottom-28 size-64 rounded-full bg-brand-500/20 blur-3xl"
      />

      <div class="relative flex h-16 items-center gap-2 px-5">
        <RouterLink :to="{ name: 'home' }"><BrandLogo /></RouterLink>
      </div>
      <p class="relative px-5 text-[11px] font-semibold tracking-[0.2em] text-white/40 uppercase">
        {{ area }}
      </p>

      <nav class="relative mt-3 flex flex-1 flex-col gap-1 overflow-y-auto px-3">
        <RouterLink
          v-for="item in items"
          :key="item.label"
          v-slot="{ href, navigate, isExactActive }"
          :to="item.to"
          custom
        >
          <a
            :href="href"
            class="group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition"
            :class="
              active(item, href, isExactActive)
                ? 'bg-white/10 text-white'
                : 'text-white/65 hover:bg-white/5 hover:text-white'
            "
            :aria-current="active(item, href, isExactActive) ? 'page' : undefined"
            @click="navigate"
          >
            <span
              class="absolute top-1/2 left-0 h-6 w-1 -translate-y-1/2 rounded-full bg-sunset transition-opacity"
              :class="active(item, href, isExactActive) ? 'opacity-100' : 'opacity-0'"
            />
            <span
              class="grid size-8 place-items-center rounded-xl transition"
              :class="
                active(item, href, isExactActive)
                  ? 'bg-sunset shadow-glow'
                  : 'bg-white/5 group-hover:bg-white/10'
              "
            >
              <component :is="item.icon" v-if="item.icon" class="size-4" />
            </span>
            <span class="flex-1">{{ item.label }}</span>
            <span
              v-if="item.badge"
              class="grid min-w-5 place-items-center rounded-full bg-flare-500 px-1.5 text-xs font-bold text-white"
            >
              {{ item.badge > 99 ? '99+' : item.badge }}
            </span>
          </a>
        </RouterLink>

        <div class="my-3 border-t border-white/10" />
        <RouterLink
          :to="{ name: 'account.security' }"
          class="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-white/65 transition hover:bg-white/5 hover:text-white"
        >
          <span class="grid size-8 place-items-center rounded-xl bg-white/5"
            ><ShieldCheck class="size-4"
          /></span>
          Sécurité du compte
        </RouterLink>
        <RouterLink
          :to="{ name: 'home' }"
          class="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-white/65 transition hover:bg-white/5 hover:text-white"
        >
          <span class="grid size-8 place-items-center rounded-xl bg-white/5"
            ><ExternalLink class="size-4"
          /></span>
          Voir le site
        </RouterLink>
      </nav>

      <div class="relative m-3 flex items-center gap-3 rounded-2xl bg-white/5 p-3">
        <span
          class="grid size-10 shrink-0 place-items-center rounded-full bg-sunset text-sm font-bold"
          >{{ initials }}</span
        >
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold">{{ auth.user?.name }}</p>
          <p class="truncate text-xs text-white/50">{{ auth.user?.email }}</p>
        </div>
        <button
          class="grid size-9 shrink-0 place-items-center rounded-xl text-white/60 transition hover:bg-white/10 hover:text-white"
          aria-label="Se déconnecter"
          title="Se déconnecter"
          @click="logout"
        >
          <LogOut class="size-4" />
        </button>
      </div>
    </aside>

    <main
      class="mx-auto w-full max-w-6xl min-w-0 flex-1 px-4 pt-6 pb-[calc(1.5rem+var(--tabbar))] lg:px-10 lg:py-8"
    >
      <RouterView v-slot="{ Component: page, route: r }">
        <Transition name="page" mode="out-in">
          <component :is="page" :key="r.meta.shellKey ?? r.path" />
        </Transition>
      </RouterView>
    </main>

    <!-- Phone and tablet: "Plus" sheet with the other destinations -->
    <Transition
      enter-active-class="transition duration-200"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-150"
      leave-to-class="opacity-0"
    >
      <div
        v-if="moreOpen"
        class="fixed inset-0 z-40 bg-night-950/60 backdrop-blur-sm lg:hidden"
        @click="moreOpen = false"
      />
    </Transition>
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="translate-y-full"
      leave-active-class="transition duration-200 ease-in"
      leave-to-class="translate-y-full"
    >
      <section
        v-if="moreOpen"
        class="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-4xl bg-white px-4 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-lift lg:hidden"
        role="dialog"
        aria-modal="true"
        :aria-label="area"
      >
        <div class="mx-auto mb-3 h-1.5 w-10 rounded-full bg-stone-300" />
        <div class="mb-4 flex items-center gap-3">
          <span
            class="grid size-11 shrink-0 place-items-center rounded-full bg-sunset text-sm font-bold text-white"
            >{{ initials }}</span
          >
          <div class="min-w-0 flex-1">
            <p class="truncate font-semibold">{{ auth.user?.name }}</p>
            <p class="truncate text-xs text-muted">{{ area }}</p>
          </div>
          <button
            type="button"
            class="grid size-10 place-items-center rounded-full bg-stone-100"
            aria-label="Fermer"
            @click="moreOpen = false"
          >
            <X class="size-5" />
          </button>
        </div>

        <nav class="grid grid-cols-3 gap-2 sm:grid-cols-4">
          <RouterLink
            v-for="item in others"
            :key="item.label"
            v-slot="{ href, navigate, isExactActive }"
            :to="item.to"
            custom
          >
            <a
              :href="href"
              class="relative flex flex-col items-center gap-2 rounded-3xl p-3 text-center text-xs font-semibold transition active:scale-95"
              :class="
                active(item, href, isExactActive) ? 'bg-brand-50 text-brand-700' : 'bg-surface'
              "
              @click="navigate"
            >
              <span
                class="grid size-11 place-items-center rounded-2xl text-white"
                :class="active(item, href, isExactActive) ? 'bg-sunset' : 'bg-night-900'"
              >
                <component :is="item.icon" v-if="item.icon" class="size-5" />
              </span>
              {{ item.label }}
              <span v-if="item.badge" class="tabbar-badge top-2 right-2">{{
                item.badge > 99 ? '99+' : item.badge
              }}</span>
            </a>
          </RouterLink>
        </nav>

        <div class="mt-4 space-y-1 border-t border-stone-100 pt-3 text-sm font-medium">
          <button
            v-if="installApp.available.value"
            type="button"
            class="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left active:bg-stone-100"
            @click="
              installApp.canPrompt.value ? installApp.install() : (iosInstallHint = !iosInstallHint)
            "
          >
            <Smartphone class="size-5 text-stone-500" />
            <span>
              Installer l’application
              <span v-if="iosInstallHint" class="block text-xs font-normal text-muted">
                Touche Partager, puis « Sur l’écran d’accueil ».
              </span>
            </span>
          </button>
          <RouterLink
            :to="{ name: 'account.security' }"
            class="flex items-center gap-3 rounded-2xl px-3 py-3 active:bg-stone-100"
          >
            <ShieldCheck class="size-5 text-stone-500" /> Sécurité du compte
          </RouterLink>
          <RouterLink
            :to="{ name: 'home' }"
            class="flex items-center gap-3 rounded-2xl px-3 py-3 active:bg-stone-100"
          >
            <ExternalLink class="size-5 text-stone-500" /> Voir le site
          </RouterLink>
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-red-700 active:bg-red-50"
            @click="logout"
          >
            <LogOut class="size-5" /> Se déconnecter
          </button>
        </div>
      </section>
    </Transition>

    <MobileTabBar
      v-if="!route.meta.hideTabBar"
      :items="tabs"
      until="lg"
      :more="{ label: 'Plus', badge: othersBadge, open: moreOpen }"
      @more="moreOpen = !moreOpen"
    />
  </div>
</template>

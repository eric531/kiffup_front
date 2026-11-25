<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ExternalLink, LogOut, Menu, ShieldCheck, X } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import BrandLogo from '@/components/BrandLogo.vue'
import type { NavItem } from '@/types/navigation'

const props = defineProps<{ area: string; items: NavItem[] }>()
const badges = computed(() => props.items.reduce((sum, item) => sum + (item.badge ?? 0), 0))

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const menuOpen = ref(false)

const initials = computed(() =>
  (auth.user?.name ?? '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join(''),
)

watch(
  () => route.fullPath,
  () => (menuOpen.value = false),
)

async function logout() {
  await auth.logout()
  await router.push({ name: 'login' })
}
</script>

<template>
  <div class="min-h-dvh bg-surface lg:flex">
    <!-- Mobile top bar -->
    <header
      class="sticky top-0 z-40 flex h-16 items-center justify-between bg-night-950 px-4 text-white lg:hidden"
    >
      <span class="flex items-center gap-2">
        <BrandLogo />
        <span class="chip bg-white/10 text-xs text-white/80">{{ area }}</span>
      </span>
      <button
        class="btn-glass relative size-10 p-0"
        :aria-expanded="menuOpen"
        aria-label="Menu"
        @click="menuOpen = !menuOpen"
      >
        <component :is="menuOpen ? X : Menu" class="size-5" />
        <span
          v-if="!menuOpen && badges"
          class="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-flare-500 px-1 text-[11px] font-bold"
        >
          {{ badges }}
        </span>
      </button>
    </header>

    <Transition
      enter-active-class="transition duration-200"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-150"
      leave-to-class="opacity-0"
    >
      <div
        v-if="menuOpen"
        class="fixed inset-0 z-40 bg-night-950/60 backdrop-blur-sm lg:hidden"
        @click="menuOpen = false"
      />
    </Transition>

    <!-- Sidebar (drawer on mobile) -->
    <aside
      class="fixed inset-y-0 left-0 z-50 flex w-72 flex-col overflow-hidden bg-night-950 text-white transition-transform duration-300 ease-out lg:sticky lg:top-0 lg:h-dvh lg:w-64 lg:translate-x-0"
      :class="menuOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <!-- Glow -->
      <div
        class="pointer-events-none absolute -top-24 -left-20 size-64 rounded-full bg-flare-500/25 blur-3xl"
      />
      <div
        class="pointer-events-none absolute -bottom-28 -right-24 size-64 rounded-full bg-brand-500/20 blur-3xl"
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
              (item.prefix ? route.path.startsWith(href) : isExactActive)
                ? 'bg-white/10 text-white'
                : 'text-white/65 hover:bg-white/5 hover:text-white'
            "
            :aria-current="
              (item.prefix ? route.path.startsWith(href) : isExactActive) ? 'page' : undefined
            "
            @click="navigate"
          >
            <span
              class="absolute top-1/2 left-0 h-6 w-1 -translate-y-1/2 rounded-full bg-sunset transition-opacity"
              :class="
                (item.prefix ? route.path.startsWith(href) : isExactActive)
                  ? 'opacity-100'
                  : 'opacity-0'
              "
            />
            <span
              class="grid size-8 place-items-center rounded-xl transition"
              :class="
                (item.prefix ? route.path.startsWith(href) : isExactActive)
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

    <main class="mx-auto w-full max-w-6xl min-w-0 flex-1 px-4 py-8 lg:px-10">
      <RouterView v-slot="{ Component: page, route: r }">
        <Transition name="page" mode="out-in">
          <component :is="page" :key="r.meta.shellKey ?? r.path" />
        </Transition>
      </RouterView>
    </main>
  </div>
</template>

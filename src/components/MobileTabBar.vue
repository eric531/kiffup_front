<script setup lang="ts">
import { useRoute } from 'vue-router'
import { Ellipsis } from 'lucide-vue-next'
import type { NavItem } from '@/types/navigation'

/**
 * Bottom tab bar on phones, as in a mobile app: the main destinations within thumb reach.
 * Hidden from the "md" breakpoint, or "lg" (the header or the sidebar take over). An optional last tab
 * ("Plus") opens the remaining destinations in a sheet.
 */
const props = defineProps<{
  items: NavItem[]
  more?: { label: string; badge?: number; open: boolean }
  /** Breakpoint from which the header or the sidebar takes over (default: md). */
  until?: 'md' | 'lg'
}>()
const emit = defineEmits<{ more: [] }>()
const route = useRoute()

const isActive = (item: NavItem, href: string, exact: boolean) =>
  !props.more?.open && (item.prefix ? route.path.startsWith(href) : exact)
const badgeText = (n: number) => (n > 99 ? '99+' : String(n))
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-night-950/95 pb-[env(safe-area-inset-bottom)] text-white backdrop-blur-xl"
    :class="until === 'lg' ? 'lg:hidden' : 'md:hidden'"
    aria-label="Navigation principale"
  >
    <ul class="mx-auto flex h-16 max-w-lg items-stretch">
      <li v-for="item in items" :key="item.label" class="flex-1">
        <RouterLink v-slot="{ href, navigate, isExactActive }" :to="item.to" custom>
          <a
            :href="href"
            class="tabbar-item"
            :class="isActive(item, href, isExactActive) ? 'text-white' : 'text-white/55'"
            :aria-current="isActive(item, href, isExactActive) ? 'page' : undefined"
            @click="navigate"
          >
            <span
              class="relative grid h-8 w-14 place-items-center rounded-full transition"
              :class="isActive(item, href, isExactActive) ? 'bg-sunset shadow-glow' : ''"
            >
              <component :is="item.icon" v-if="item.icon" class="size-5" />
              <span v-if="item.badge" class="tabbar-badge">{{ badgeText(item.badge) }}</span>
            </span>
            <span class="max-w-full truncate px-1">{{ item.short ?? item.label }}</span>
          </a>
        </RouterLink>
      </li>
      <li v-if="more" class="flex-1">
        <button
          type="button"
          class="tabbar-item w-full"
          :class="more.open ? 'text-white' : 'text-white/55'"
          :aria-expanded="more.open"
          @click="emit('more')"
        >
          <span
            class="relative grid h-8 w-14 place-items-center rounded-full transition"
            :class="more.open ? 'bg-sunset shadow-glow' : ''"
          >
            <Ellipsis class="size-5" />
            <span v-if="more.badge" class="tabbar-badge">{{ badgeText(more.badge) }}</span>
          </span>
          <span>{{ more.label }}</span>
        </button>
      </li>
    </ul>
  </nav>
</template>

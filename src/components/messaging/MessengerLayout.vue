<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { MessagesSquare, Search } from 'lucide-vue-next'
import { useConversations } from '@/composables/useConversations'
import ConversationList from '@/components/messaging/ConversationList.vue'
import type { ConversationSummary, MessagingSide } from '@/types/messaging'

/**
 * Messenger-like inbox (lot F9): conversations on the left, the open one on the right. On a phone,
 * one pane at a time: the list, or the conversation with a back arrow. The list stays mounted while
 * the customer or the partner moves from one conversation to another.
 */
const props = defineProps<{ side: MessagingSide; title: string; hint: string }>()

const route = useRoute()
const { conversations, loading, error } = useConversations(props.side)
const selectedId = computed(() => Number(route.params.conversationId) || null)
const query = ref('')

const name = (c: ConversationSummary) =>
  props.side === 'customer' ? (c.partner?.name ?? '') : c.customer.name
const filtered = computed(() => {
  const q = query.value.trim().toLocaleLowerCase('fr')
  return q
    ? conversations.value.filter((c) => name(c).toLocaleLowerCase('fr').includes(q))
    : conversations.value
})
const link = (c: ConversationSummary) => ({
  name: props.side === 'partner' ? 'partner.conversation' : 'customer.conversation',
  params: { conversationId: c.id },
})
</script>

<template>
  <div
    class="flex h-full min-h-0 overflow-hidden bg-white lg:rounded-3xl lg:border lg:border-stone-200 lg:shadow-sm"
  >
    <!-- Conversations -->
    <aside
      class="min-h-0 w-full flex-col border-stone-200 lg:flex lg:w-80 lg:border-r xl:w-96"
      :class="selectedId ? 'hidden' : 'flex'"
    >
      <div class="space-y-3 px-4 pt-4 pb-3">
        <h1 class="font-display text-2xl font-bold">{{ title }}</h1>
        <label class="relative block">
          <Search
            class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
          />
          <input
            v-model="query"
            type="search"
            class="w-full rounded-full border-0 bg-stone-100 py-2 pr-4 pl-9 text-base focus:ring-2 focus:ring-brand-300 focus:outline-none"
            placeholder="Rechercher"
            aria-label="Rechercher une conversation"
          />
        </label>
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <p v-if="loading" class="px-3 py-6 text-sm text-muted">Chargement…</p>
        <p v-else-if="error" class="alert-error mx-2">{{ error }}</p>
        <div v-else-if="!conversations.length" class="px-4 py-10 text-center">
          <MessagesSquare class="mx-auto size-10 text-brand-500" />
          <p class="mt-3 font-semibold">Aucune conversation pour le moment</p>
          <p class="mt-1 text-sm text-muted">{{ hint }}</p>
          <slot name="empty-action" />
        </div>
        <p v-else-if="!filtered.length" class="px-3 py-6 text-sm text-muted">
          Aucun résultat pour « {{ query }} ».
        </p>
        <ConversationList
          v-else
          :side="side"
          :conversations="filtered"
          :link="link"
          :selected-id="selectedId"
        />
      </div>
    </aside>

    <!-- Open conversation -->
    <section
      class="min-h-0 min-w-0 flex-1 flex-col lg:flex"
      :class="selectedId ? 'flex' : 'hidden'"
    >
      <RouterView v-slot="{ Component, route: r }">
        <component :is="Component" :key="String(r.params.conversationId ?? 'none')" />
      </RouterView>
    </section>
  </div>
</template>

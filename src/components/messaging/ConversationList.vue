<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import type { ConversationSummary, MessagingSide } from '@/types/messaging'

/** Conversations, most recent first, with the unread count (lot F9). */
const props = defineProps<{
  side: MessagingSide | 'admin'
  conversations: ConversationSummary[]
  link: (conversation: ConversationSummary) => RouteLocationRaw
  selectedId?: number | null
}>()

const timeFormat = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })
const dayFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })
function when(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  return date.toDateString() === new Date().toDateString()
    ? timeFormat.format(date)
    : dayFormat.format(date)
}

function name(conversation: ConversationSummary): string {
  if (props.side === 'customer') return conversation.partner?.name ?? 'Établissement'
  if (props.side === 'partner') return conversation.customer.name
  return `${conversation.customer.name} ↔ ${conversation.partner?.name ?? '?'}`
}

function preview(conversation: ConversationSummary): string {
  const last = conversation.last_message
  if (!last) return ''
  const mine = props.side !== 'admin' && last.sender === props.side
  return `${mine ? (props.side === 'customer' ? 'Toi : ' : 'Vous : ') : ''}${last.preview}`
}
</script>

<template>
  <ul class="space-y-0.5">
    <li v-for="conversation in conversations" :key="conversation.id">
      <RouterLink
        :to="link(conversation)"
        class="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition"
        :class="conversation.id === selectedId ? 'bg-brand-50' : 'hover:bg-stone-100'"
      >
        <span
          class="grid size-11 shrink-0 place-items-center rounded-full bg-sunset font-bold text-white"
        >
          {{ name(conversation).charAt(0).toUpperCase() }}
        </span>
        <span class="min-w-0 flex-1">
          <span class="flex items-baseline justify-between gap-2">
            <span class="truncate" :class="conversation.unread ? 'font-bold' : 'font-semibold'">{{
              name(conversation)
            }}</span>
            <span
              class="shrink-0 text-xs"
              :class="conversation.unread ? 'font-semibold text-brand-700' : 'text-muted'"
            >
              {{ when(conversation.last_message_at) }}
            </span>
          </span>
          <span class="flex items-center justify-between gap-2">
            <span
              class="truncate text-sm"
              :class="conversation.unread ? 'font-medium text-stone-800' : 'text-muted'"
            >
              {{ preview(conversation) }}
            </span>
            <span
              v-if="conversation.unread"
              class="grid min-w-5 shrink-0 place-items-center rounded-full bg-brand-600 px-1.5 text-xs font-bold text-white"
            >
              {{ conversation.unread }}
            </span>
            <span
              v-else-if="conversation.blocked"
              class="chip shrink-0 bg-stone-100 text-[11px] text-muted"
            >
              Fermée
            </span>
          </span>
        </span>
      </RouterLink>
    </li>
  </ul>
</template>

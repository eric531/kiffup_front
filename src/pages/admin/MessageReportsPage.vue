<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { FileText, Flag } from 'lucide-vue-next'
import { api, apiUrl, ApiError } from '@/lib/api'
import type { ChatMessage, ConversationDetail, ConversationSummary } from '@/types/messaging'

/**
 * Reported conversations (lot F9). The team reads a conversation only once the customer or the
 * partner reported it; the others stay private.
 */
const tab = ref<'open' | 'closed'>('open')
const reports = ref<ConversationSummary[]>([])
const openCount = ref(0)
const loading = ref(true)
const selected = ref<ConversationSummary | null>(null)
const messages = ref<ChatMessage[]>([])
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  try {
    const response = await api.get<{ data: ConversationSummary[]; meta: { open: number } }>(
      '/api/v1/admin/messaging/reports',
      { closed: tab.value === 'closed' ? 1 : undefined },
    )
    reports.value = response.data
    openCount.value = response.meta.open
  } finally {
    loading.value = false
  }
}

async function select(conversation: ConversationSummary) {
  selected.value = conversation
  messages.value = []
  messages.value = (
    await api.get<ConversationDetail>(`/api/v1/admin/messaging/reports/${conversation.id}`)
  ).messages
}

async function close(action: 'dismiss' | 'block') {
  if (!selected.value) return
  error.value = null
  try {
    await api.post(`/api/v1/admin/messaging/reports/${selected.value.id}/close`, { action })
    selected.value = null
    await load()
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Action impossible.'
  }
}

const format = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
const when = (iso: string) => format.format(new Date(iso))

onMounted(load)
watch(tab, () => {
  selected.value = null
  void load()
})
</script>

<template>
  <div>
    <h1 class="font-display text-3xl font-bold">Messages signalés</h1>
    <p class="mt-1 text-muted">
      Conversations signalées par un client ou un partenaire. Les autres restent privées.
    </p>

    <div class="mt-6 flex gap-2">
      <button
        type="button"
        class="chip"
        :class="tab === 'open' ? 'bg-night-900 text-white' : 'bg-white'"
        @click="tab = 'open'"
      >
        À traiter ({{ openCount }})
      </button>
      <button
        type="button"
        class="chip"
        :class="tab === 'closed' ? 'bg-night-900 text-white' : 'bg-white'"
        @click="tab = 'closed'"
      >
        Traités
      </button>
    </div>

    <p v-if="loading" class="mt-6 text-muted">Chargement…</p>
    <div v-else-if="!reports.length" class="card mt-6 p-8 text-center text-muted">
      <Flag class="mx-auto size-8" />
      <p class="mt-2">Aucun signalement {{ tab === 'open' ? 'à traiter' : 'traité' }}.</p>
    </div>
    <div v-else class="mt-6 grid gap-6 lg:grid-cols-[22rem_1fr]">
      <ul class="space-y-2">
        <li v-for="report in reports" :key="report.id">
          <button
            type="button"
            class="card w-full p-4 text-left transition hover:border-brand-300"
            :class="selected?.id === report.id ? 'border-brand-500' : ''"
            @click="select(report)"
          >
            <p class="font-semibold">{{ report.customer.name }} ↔ {{ report.partner?.name }}</p>
            <p class="mt-1 text-sm">
              Signalé par {{ report.report?.by === 'partner' ? 'le partenaire' : 'le client' }}
              <span v-if="report.report" class="text-muted">· {{ when(report.report.at) }}</span>
            </p>
            <p class="mt-1 line-clamp-2 text-sm text-muted">« {{ report.report?.reason }} »</p>
          </button>
        </li>
      </ul>

      <section v-if="selected" class="card flex max-h-[70dvh] flex-col p-0">
        <header class="border-b border-stone-200 p-4">
          <p class="font-semibold">{{ selected.customer.name }} ↔ {{ selected.partner?.name }}</p>
          <p class="text-sm text-muted">Motif : « {{ selected.report?.reason }} »</p>
        </header>
        <div class="flex-1 space-y-2 overflow-y-auto bg-stone-50 p-4">
          <div
            v-for="message in messages"
            :key="message.id"
            class="flex"
            :class="message.sender === 'partner' ? 'justify-end' : 'justify-start'"
          >
            <div
              class="max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm"
              :class="message.sender === 'partner' ? 'bg-brand-50' : 'bg-white'"
            >
              <p class="text-[11px] font-semibold text-muted">
                {{ message.sender === 'partner' ? selected.partner?.name : selected.customer.name }}
                · {{ when(message.created_at) }}
              </p>
              <img
                v-if="message.attachment?.is_image"
                :src="apiUrl(message.attachment.url)"
                alt=""
                class="mt-1 max-h-56 rounded-xl"
              />
              <a
                v-else-if="message.attachment"
                :href="apiUrl(message.attachment.url)"
                target="_blank"
                rel="noopener"
                class="mt-1 flex items-center gap-1 underline"
              >
                <FileText class="size-4" /> {{ message.attachment.name }}
              </a>
              <p v-if="message.body" class="whitespace-pre-wrap">{{ message.body }}</p>
            </div>
          </div>
        </div>
        <footer
          v-if="!selected.report?.closed_at"
          class="flex flex-wrap items-center justify-end gap-2 border-t border-stone-200 p-4"
        >
          <p v-if="error" class="input-error mr-auto">{{ error }}</p>
          <button type="button" class="btn-ghost" @click="close('dismiss')">Rien à signaler</button>
          <button type="button" class="btn-primary" @click="close('block')">
            Fermer la conversation
          </button>
        </footer>
      </section>
    </div>
  </div>
</template>

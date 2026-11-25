<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import {
  AlertCircle,
  ArrowLeft,
  Ban,
  Check,
  CheckCheck,
  FileText,
  Flag,
  LockOpen,
  MoreVertical,
  Paperclip,
  SendHorizontal,
  Smile,
  X,
} from 'lucide-vue-next'
import { api, apiUrl, ApiError, upload } from '@/lib/api'
import { realtime, realtimeConnected } from '@/lib/realtime'
import { useMessagingStore } from '@/stores/messaging'
import EmojiPicker from '@/components/messaging/EmojiPicker.vue'
import type {
  ChatMessage,
  ConversationDetail,
  ConversationSummary,
  MessageAttachment,
  MessagingSide,
} from '@/types/messaging'

/**
 * One conversation, Messenger-like (lot F9): a message shows at once and is sent in the background
 * ("Envoi…", "Réessayer" on failure), bubbles grouped by sender, "En ligne" while the other side is
 * on KiffUp, "écrit…", "Lu". Without WebSocket it polls every 8 seconds.
 */
const props = defineProps<{
  side: MessagingSide
  conversationId: number
  back: RouteLocationRaw
  /** Customer coming from an offer or a video: sent with the first message. */
  context?: { listing_id?: number; video_id?: number; title?: string } | null
}>()
const emit = defineEmits<{ passRequired: [] }>()

const store = useMessagingStore()
const base = computed(() =>
  props.side === 'partner' ? '/api/v1/partner/conversations' : '/api/v1/customer/conversations',
)
const other = computed<MessagingSide>(() => (props.side === 'customer' ? 'partner' : 'customer'))
/** Customers are addressed with "tu", partners with "vous" (RG52). */
const say = (tu: string, vous: string) => (props.side === 'customer' ? tu : vous)

const conversation = ref<ConversationSummary | null>(null)
const messages = ref<ChatMessage[]>([])
const hasMore = ref(false)
const loading = ref(true)
const loadError = ref<string | null>(null)
const loadingOlder = ref(false)

const title = computed(() =>
  props.side === 'customer'
    ? (conversation.value?.partner?.name ?? 'Établissement')
    : (conversation.value?.customer.name ?? 'Client'),
)
const initial = computed(() => title.value.charAt(0).toUpperCase())

// ─── Loading
const list = ref<HTMLElement | null>(null)
function nearBottom(): boolean {
  const el = list.value
  return !el || el.scrollHeight - el.scrollTop - el.clientHeight < 160
}
async function scrollToBottom(smooth = false) {
  await nextTick()
  list.value?.scrollTo({ top: list.value.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
}

function merge(incoming: ChatMessage[]): boolean {
  const known = new Set(messages.value.map((m) => m.id))
  const fresh = incoming.filter((m) => !known.has(m.id))
  if (!fresh.length) return false
  messages.value = [...messages.value, ...fresh].sort((a, b) => a.id - b.id)
  return true
}

async function load() {
  loading.value = true
  loadError.value = null
  try {
    const response = await api.get<ConversationDetail>(`${base.value}/${props.conversationId}`)
    conversation.value = response.data
    messages.value = response.messages
    hasMore.value = response.has_more ?? false
    watchOnline()
    await scrollToBottom()
    void markRead()
  } catch (e) {
    loadError.value =
      e instanceof ApiError && e.status === 404
        ? 'Cette conversation n’existe pas ou plus.'
        : e instanceof Error
          ? e.message
          : 'Chargement impossible.'
  } finally {
    loading.value = false
  }
}

async function loadOlder() {
  const first = messages.value[0]
  if (!first || loadingOlder.value) return
  loadingOlder.value = true
  const el = list.value
  const before = el?.scrollHeight ?? 0
  try {
    const response = await api.get<ConversationDetail>(`${base.value}/${props.conversationId}`, {
      before: first.id,
    })
    messages.value = [...response.messages, ...messages.value]
    hasMore.value = response.has_more ?? false
    await nextTick()
    if (el) el.scrollTop = el.scrollHeight - before
  } finally {
    loadingOlder.value = false
  }
}

let readPending = false
let readAgain = false
async function markRead() {
  if (document.visibilityState !== 'visible') return
  const last = messages.value.at(-1)
  if (!last || last.sender === props.side) return
  // A message arriving while the previous "read" is on its way: read again right after.
  if (readPending) {
    readAgain = true
    return
  }
  readPending = true
  try {
    await api.post(`${base.value}/${props.conversationId}/read`)
  } catch {
    // the next message will try again
  } finally {
    readPending = false
    if (readAgain) {
      readAgain = false
      void markRead()
    }
  }
}

// ─── Composer state (declared early: the real-time handlers use the outbox)
interface OutgoingMessage extends ChatMessage {
  status: 'sending' | 'failed'
  error: string | null
  progress: number | null
  file: File | null
  payload: { listing_id?: number; video_id?: number }
}
const outbox = ref<OutgoingMessage[]>([])
let tempId = 0

function dropOutbox(index: number) {
  if (index < 0) return
  const [item] = outbox.value.splice(index, 1)
  if (item?.attachment?.url.startsWith('blob:')) URL.revokeObjectURL(item.attachment.url)
}

// ─── Real time
const typing = ref(false)
let typingTimer: ReturnType<typeof setTimeout> | undefined
const conversationChannel = computed(() => `messaging.conversation.${props.conversationId}`)

function received(message: ChatMessage) {
  const stick = nearBottom() || message.sender === props.side
  // My own message coming back through the WebSocket: it replaces its "Envoi…" copy.
  if (message.sender === props.side) {
    dropOutbox(
      outbox.value.findIndex(
        (o) =>
          o.status === 'sending' &&
          (o.body ?? '') === (message.body ?? '') &&
          !!o.attachment === !!message.attachment,
      ),
    )
  }
  if (!merge([message])) return
  if (message.sender !== props.side) {
    typing.value = false
    void markRead()
  }
  if (stick) void scrollToBottom(true)
}

const offPosted = store.onPosted((event) => {
  if (event.conversation_id === props.conversationId) received(event.message)
})
const offRead = store.onRead((event) => {
  if (
    event.conversation_id === props.conversationId &&
    event.side === other.value &&
    conversation.value
  )
    conversation.value.other_read_id = event.read_id
})

// "En ligne": the other side is somewhere on KiffUp (its own presence channel), like Messenger.
type Member = { id: number; side: MessagingSide }
const othersHere = ref(new Set<number>())
const online = computed(() => othersHere.value.size > 0)
let onlineChannel: string | null = null
function watchOnline() {
  const c = conversation.value
  const otherId = props.side === 'customer' ? c?.partner?.id : c?.customer.id
  if (!otherId || onlineChannel) return
  onlineChannel = `messaging.online.${other.value}.${otherId}`
  const keep = (members: Member[]) =>
    (othersHere.value = new Set(members.filter((m) => m.side === other.value).map((m) => m.id)))
  realtime()
    ?.join(onlineChannel)
    .here(keep)
    .joining((m: Member) => {
      if (m.side === other.value) othersHere.value = new Set([...othersHere.value, m.id])
    })
    .leaving((m: Member) => {
      const next = new Set(othersHere.value)
      next.delete(m.id)
      othersHere.value = next
    })
}

function joinConversation() {
  realtime()
    ?.join(conversationChannel.value)
    .listenForWhisper('typing', (event: { side: MessagingSide }) => {
      if (event.side !== other.value) return
      const stick = nearBottom()
      typing.value = true
      if (stick) void scrollToBottom(true)
      clearTimeout(typingTimer)
      typingTimer = setTimeout(() => (typing.value = false), 3500)
    })
}

// Without WebSocket: new messages and "Lu" every 8 seconds.
let poll: ReturnType<typeof setInterval> | undefined
async function pollLatest() {
  if (realtimeConnected() || loading.value) return
  try {
    const response = await api.get<ConversationDetail>(`${base.value}/${props.conversationId}`)
    const stick = nearBottom()
    conversation.value = response.data
    if (merge(response.messages)) {
      void markRead()
      if (stick) void scrollToBottom(true)
    }
  } catch {
    // offline for a moment
  }
}

function onVisible() {
  if (document.visibilityState === 'visible') void markRead()
}

// ─── Composer
const text = ref('')
const textarea = ref<HTMLTextAreaElement | null>(null)
const file = ref<File | null>(null)
const preview = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const pickError = ref<string | null>(null)
const emojiOpen = ref(false)
const contextSent = ref(false)
const pendingContext = computed(() =>
  props.side === 'customer' && !contextSent.value && props.context?.title ? props.context : null,
)
const MAX_TEXT = 2000

function autosize() {
  const el = textarea.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 140)}px`
}

let lastWhisper = 0
function onInput() {
  autosize()
  const now = Date.now()
  if (now - lastWhisper < 2000 || !text.value) return
  lastWhisper = now
  realtime()?.join(conversationChannel.value).whisper('typing', { side: props.side })
}

function insertEmoji(emoji: string) {
  const el = textarea.value
  const start = el?.selectionStart ?? text.value.length
  const end = el?.selectionEnd ?? text.value.length
  text.value = text.value.slice(0, start) + emoji + text.value.slice(end)
  void nextTick(() => {
    el?.focus()
    el?.setSelectionRange(start + emoji.length, start + emoji.length)
    autosize()
  })
}

/** Phone photos of several MB: reduced before sending (the server compresses again). */
async function shrink(input: File): Promise<File> {
  if (!input.type.startsWith('image/') || input.type === 'image/gif' || input.size < 600_000)
    return input
  try {
    const bitmap = await createImageBitmap(input)
    const scale = Math.min(1, 1600 / bitmap.width)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85),
    )
    if (!blob) return input
    return new File([blob], input.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return input
  }
}

function pickFile(event: Event) {
  const input = event.target as HTMLInputElement
  const chosen = input.files?.[0]
  input.value = ''
  if (!chosen) return
  pickError.value = null
  if (!chosen.type.startsWith('image/') && chosen.type !== 'application/pdf') {
    pickError.value = say('Envoie une photo ou un PDF.', 'Envoyez une photo ou un PDF.')
    return
  }
  if (preview.value) URL.revokeObjectURL(preview.value)
  file.value = chosen
  preview.value = chosen.type.startsWith('image/') ? URL.createObjectURL(chosen) : null
}

function clearFile(revoke = true) {
  if (revoke && preview.value) URL.revokeObjectURL(preview.value)
  preview.value = null
  file.value = null
}

const canSend = computed(
  () => !conversation.value?.blocked && (text.value.trim() !== '' || file.value !== null),
)

/** The message shows at once; it is sent in the background. */
function send() {
  if (!canSend.value) return
  const body = text.value.trim()
  const chosen = file.value
  const context = pendingContext.value
  const attachment: MessageAttachment | null = chosen
    ? {
        url: preview.value ?? '',
        name: chosen.name,
        mime: chosen.type,
        size: chosen.size,
        width: null,
        height: null,
        is_image: chosen.type.startsWith('image/'),
      }
    : null
  const item: OutgoingMessage = {
    id: --tempId,
    conversation_id: props.conversationId,
    sender: props.side,
    body: body || null,
    context: context?.title
      ? {
          type: context.listing_id ? 'listing' : 'video',
          id: context.listing_id ?? context.video_id ?? 0,
          title: context.title,
        }
      : null,
    attachment,
    created_at: new Date().toISOString(),
    status: 'sending',
    error: null,
    progress: null,
    file: chosen,
    payload: { listing_id: context?.listing_id, video_id: context?.video_id },
  }
  outbox.value.push(item)
  text.value = ''
  clearFile(false)
  contextSent.value = true
  emojiOpen.value = false
  void nextTick(autosize)
  void scrollToBottom(true)
  void deliver(outbox.value[outbox.value.length - 1]!)
}

async function deliver(item: OutgoingMessage) {
  item.status = 'sending'
  item.error = null
  try {
    let message: ChatMessage
    if (item.file) {
      const form = new FormData()
      if (item.body) form.append('body', item.body)
      form.append('attachment', await shrink(item.file))
      if (item.payload.listing_id) form.append('listing_id', String(item.payload.listing_id))
      if (item.payload.video_id) form.append('video_id', String(item.payload.video_id))
      item.progress = 0
      message = (
        await upload<{ data: ChatMessage }>(
          `${base.value}/${props.conversationId}/messages`,
          form,
          (p) => (item.progress = p),
        )
      ).data
    } else {
      message = (
        await api.post<{ data: ChatMessage }>(`${base.value}/${props.conversationId}/messages`, {
          body: item.body,
          ...item.payload,
        })
      ).data
    }
    dropOutbox(outbox.value.indexOf(item))
    merge([message])
  } catch (e) {
    item.status = 'failed'
    item.progress = null
    if (e instanceof ApiError && e.status === 402) emit('passRequired')
    if (e instanceof ApiError && e.status === 403 && conversation.value)
      conversation.value.blocked = true
    item.error =
      e instanceof ApiError && e.status === 413
        ? 'Fichier trop lourd.'
        : e instanceof ApiError && e.status !== 0
          ? (Object.values(e.errors)[0]?.[0] ?? e.detail ?? e.message)
          : 'Pas de connexion.'
  }
}

function onKeydown(event: KeyboardEvent) {
  // Enter sends on a computer; on a phone the keyboard's return key adds a line.
  if (event.key === 'Enter' && !event.shiftKey && window.matchMedia('(pointer: fine)').matches) {
    event.preventDefault()
    send()
  }
}

onMounted(() => {
  store.openConversation = props.conversationId
  void load()
  joinConversation()
  poll = setInterval(pollLatest, 8000)
  document.addEventListener('visibilitychange', onVisible)
})
onBeforeUnmount(() => {
  if (store.openConversation === props.conversationId) store.openConversation = null
  offPosted()
  offRead()
  realtime()?.leave(conversationChannel.value)
  if (onlineChannel) realtime()?.leave(onlineChannel)
  clearInterval(poll)
  clearTimeout(typingTimer)
  document.removeEventListener('visibilitychange', onVisible)
  outbox.value.forEach(
    (o) => o.attachment?.url.startsWith('blob:') && URL.revokeObjectURL(o.attachment.url),
  )
  if (preview.value) URL.revokeObjectURL(preview.value)
})

// ─── Menu: close the conversation (partner), report (both)
const menuOpen = ref(false)
const reporting = ref(false)
const reportReason = ref('')
const reportError = ref<string | null>(null)
const notice = ref<string | null>(null)

async function toggleBlock() {
  menuOpen.value = false
  if (!conversation.value) return
  const blocked = conversation.value.blocked
  const response = blocked
    ? await api.delete<{ data: ConversationSummary }>(`${base.value}/${props.conversationId}/block`)
    : await api.put<{ data: ConversationSummary }>(`${base.value}/${props.conversationId}/block`)
  conversation.value = response.data
  notice.value = blocked
    ? 'Conversation rouverte : le client peut de nouveau vous écrire.'
    : 'Conversation fermée : le client ne peut plus vous écrire.'
}

async function report() {
  reportError.value = null
  try {
    await api.post(`${base.value}/${props.conversationId}/report`, { reason: reportReason.value })
    reporting.value = false
    reportReason.value = ''
    notice.value = 'Merci, l’équipe KiffUp va regarder cette conversation.'
  } catch (e) {
    reportError.value =
      e instanceof ApiError ? (e.fieldError('reason') ?? e.message) : 'Envoi impossible.'
  }
}

// ─── Display: bubbles grouped like Messenger
const lightbox = ref<string | null>(null)
const dayFormat = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})
const timeFormat = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })
function dayLabel(iso: string): string {
  const day = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (day.toDateString() === today.toDateString()) return 'Aujourd’hui'
  if (day.toDateString() === yesterday.toDateString()) return 'Hier'
  return dayFormat.format(day)
}

const GROUP_GAP_MS = 5 * 60_000
const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}|\p{Emoji_Modifier}|‍|️|\s){1,12}$/u
type AnyMessage = ChatMessage | OutgoingMessage
interface Row {
  message: AnyMessage
  out: OutgoingMessage | null
  mine: boolean
  day: string | null
  first: boolean
  last: boolean
  time: string
  big: boolean
}
function together(a: AnyMessage | undefined, b: AnyMessage | undefined): boolean {
  return (
    !!a &&
    !!b &&
    a.sender === b.sender &&
    dayLabel(a.created_at) === dayLabel(b.created_at) &&
    Math.abs(Date.parse(b.created_at) - Date.parse(a.created_at)) < GROUP_GAP_MS
  )
}
const rows = computed<Row[]>(() => {
  const all: AnyMessage[] = [...messages.value, ...outbox.value]
  return all.map((message, i) => {
    const prev = all[i - 1]
    const next = all[i + 1]
    const day = dayLabel(message.created_at)
    const body = message.body ?? ''
    return {
      message,
      out: 'status' in message ? message : null,
      mine: message.sender === props.side,
      day: !prev || dayLabel(prev.created_at) !== day ? day : null,
      first: !together(prev, message),
      last: !together(message, next),
      time: timeFormat.format(new Date(message.created_at)),
      big:
        !message.attachment &&
        !message.context &&
        body !== '' &&
        EMOJI_ONLY.test(body) &&
        !/[\d#*]/.test(body),
    }
  })
})
const lastMineId = computed(
  () => [...messages.value].reverse().find((m) => m.sender === props.side)?.id,
)
const lastMineRead = computed(
  () =>
    lastMineId.value !== undefined && (conversation.value?.other_read_id ?? 0) >= lastMineId.value,
)
const srcOf = (attachment: MessageAttachment) =>
  attachment.url.startsWith('blob:') ? attachment.url : apiUrl(attachment.url)
function size(bytes: number): string {
  return bytes >= 1_000_000
    ? `${(bytes / 1_000_000).toFixed(1)} Mo`
    : `${Math.ceil(bytes / 1000)} Ko`
}
function bubbleShape(row: Row): string {
  if (row.mine)
    return `rounded-l-3xl ${row.first ? 'rounded-tr-3xl' : 'rounded-tr-md'} ${row.last ? 'rounded-br-3xl' : 'rounded-br-md'}`
  return `rounded-r-3xl ${row.first ? 'rounded-tl-3xl' : 'rounded-tl-md'} ${row.last ? 'rounded-bl-3xl' : 'rounded-bl-md'}`
}
</script>

<template>
  <div class="relative flex h-full min-h-0 flex-col bg-white">
    <!-- Header -->
    <header class="flex items-center gap-3 border-b border-stone-200 px-3 py-2.5">
      <RouterLink
        :to="back"
        class="grid size-9 shrink-0 place-items-center rounded-full transition hover:bg-stone-100 lg:hidden"
        aria-label="Retour aux conversations"
      >
        <ArrowLeft class="size-5" />
      </RouterLink>
      <span
        class="relative grid size-10 shrink-0 place-items-center rounded-full bg-sunset font-bold text-white"
      >
        {{ initial }}
        <span
          v-if="online"
          class="absolute right-0 bottom-0 size-3 rounded-full border-2 border-white bg-emerald-500"
        />
      </span>
      <div class="min-w-0 flex-1">
        <p class="truncate leading-tight font-semibold">{{ title }}</p>
        <p class="truncate text-xs" :class="online || typing ? 'text-emerald-600' : 'text-muted'">
          {{
            typing
              ? 'écrit…'
              : online
                ? 'En ligne'
                : side === 'customer'
                  ? (conversation?.partner?.city ?? '')
                  : 'Hors ligne'
          }}
        </p>
      </div>
      <div class="relative">
        <button
          type="button"
          class="grid size-9 place-items-center rounded-full transition hover:bg-stone-100"
          aria-label="Plus d’actions"
          :aria-expanded="menuOpen"
          @click="menuOpen = !menuOpen"
        >
          <MoreVertical class="size-5" />
        </button>
        <div
          v-if="menuOpen"
          class="absolute top-11 right-0 z-20 w-60 overflow-hidden rounded-2xl border border-stone-200 bg-white py-1 text-sm shadow-xl"
        >
          <button
            v-if="side === 'partner'"
            type="button"
            class="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-stone-50"
            @click="toggleBlock"
          >
            <component :is="conversation?.blocked ? LockOpen : Ban" class="size-4" />
            {{ conversation?.blocked ? 'Rouvrir la conversation' : 'Fermer la conversation' }}
          </button>
          <button
            type="button"
            class="flex w-full items-center gap-2 px-4 py-2.5 text-left text-red-600 hover:bg-red-50"
            @click="((reporting = true), (menuOpen = false))"
          >
            <Flag class="size-4" /> Signaler à KiffUp
          </button>
        </div>
      </div>
    </header>

    <p
      v-if="notice"
      class="flex items-start gap-2 bg-emerald-50 px-4 py-2 text-sm text-emerald-800"
    >
      <Check class="mt-0.5 size-4 shrink-0" /> <span class="flex-1">{{ notice }}</span>
      <button type="button" aria-label="Fermer" @click="notice = null"><X class="size-4" /></button>
    </p>

    <!-- Messages -->
    <div ref="list" class="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5">
      <p v-if="loading" class="py-10 text-center text-sm text-muted">Chargement…</p>
      <p v-else-if="loadError" class="py-10 text-center text-sm text-red-600">{{ loadError }}</p>
      <template v-else>
        <div v-if="hasMore" class="pb-3 text-center">
          <button
            type="button"
            class="chip bg-stone-100 text-xs"
            :disabled="loadingOlder"
            @click="loadOlder"
          >
            {{ loadingOlder ? 'Chargement…' : 'Messages précédents' }}
          </button>
        </div>

        <div v-if="!messages.length && !outbox.length" class="mx-auto max-w-xs py-10 text-center">
          <span
            class="mx-auto grid size-16 place-items-center rounded-full bg-sunset text-2xl font-bold text-white"
            >{{ initial }}</span
          >
          <p class="mt-3 font-semibold">{{ title }}</p>
          <p class="mt-1 text-sm text-muted">
            {{
              side === 'customer'
                ? 'Pose ta question : disponibilités, prix, accès…'
                : 'Aucun message pour le moment.'
            }}
          </p>
        </div>

        <template v-for="row in rows" :key="row.message.id">
          <p
            v-if="row.day"
            class="pt-3 pb-2 text-center text-xs font-medium text-muted first-letter:uppercase"
          >
            {{ row.day }}
          </p>
          <div
            class="flex items-end gap-2"
            :class="[row.mine ? 'justify-end' : 'justify-start', row.first ? 'mt-3' : 'mt-0.5']"
            :title="row.time"
          >
            <!-- The other side's avatar, next to its last bubble -->
            <span v-if="!row.mine" class="mb-5 size-7 shrink-0">
              <span
                v-if="row.last"
                class="grid size-7 place-items-center rounded-full bg-sunset text-xs font-bold text-white"
                >{{ initial }}</span
              >
            </span>

            <div class="flex max-w-[78%] flex-col" :class="row.mine ? 'items-end' : 'items-start'">
              <p v-if="row.message.context" class="mb-1 px-1 text-xs text-muted">
                À propos de : <strong>{{ row.message.context.title }}</strong>
              </p>
              <button
                v-if="row.message.attachment?.is_image"
                type="button"
                class="relative mb-0.5 block overflow-hidden rounded-2xl"
                @click="lightbox = srcOf(row.message.attachment)"
              >
                <img
                  :src="srcOf(row.message.attachment)"
                  :alt="row.message.attachment.name"
                  :width="row.message.attachment.width ?? undefined"
                  :height="row.message.attachment.height ?? undefined"
                  class="max-h-72 w-auto object-cover"
                  :class="row.out?.status === 'sending' ? 'opacity-60' : ''"
                  loading="lazy"
                />
                <span
                  v-if="row.out?.status === 'sending' && row.out.progress !== null"
                  class="absolute inset-x-0 bottom-0 h-1 bg-white/40"
                >
                  <span class="block h-full bg-white" :style="{ width: `${row.out.progress}%` }" />
                </span>
              </button>
              <a
                v-else-if="row.message.attachment"
                :href="srcOf(row.message.attachment)"
                target="_blank"
                rel="noopener"
                class="mb-0.5 flex items-center gap-2 rounded-2xl bg-stone-100 px-3 py-2"
              >
                <FileText class="size-6 shrink-0 text-brand-600" />
                <span class="min-w-0">
                  <span class="block truncate text-sm font-semibold">{{
                    row.message.attachment.name
                  }}</span>
                  <span class="text-xs text-muted"
                    >PDF · {{ size(row.message.attachment.size) }}</span
                  >
                </span>
              </a>
              <p v-if="row.big" class="px-1 text-4xl leading-tight">{{ row.message.body }}</p>
              <p
                v-else-if="row.message.body"
                class="px-3.5 py-2 text-[15px] leading-snug break-words whitespace-pre-wrap"
                :class="[
                  bubbleShape(row),
                  row.mine ? 'bg-brand-600 text-white' : 'bg-stone-100 text-stone-900',
                  row.out?.status === 'sending' ? 'opacity-70' : '',
                ]"
              >
                {{ row.message.body }}
              </p>

              <!-- Under the last bubble of a group: time, then sending state or "Lu" -->
              <p
                v-if="row.out?.status === 'failed'"
                class="mt-1 flex flex-wrap items-center gap-1 px-1 text-xs text-red-600"
              >
                <AlertCircle class="size-3.5" /> Non envoyé : {{ row.out.error }}
                <button
                  type="button"
                  class="font-semibold underline"
                  @click="row.out && deliver(row.out)"
                >
                  Réessayer
                </button>
                ·
                <button
                  type="button"
                  class="underline"
                  @click="dropOutbox(outbox.indexOf(row.out))"
                >
                  Supprimer
                </button>
              </p>
              <p v-else-if="row.out" class="mt-1 px-1 text-[11px] text-muted">Envoi…</p>
              <p
                v-else-if="row.last"
                class="mt-1 flex items-center gap-1 px-1 text-[11px] text-muted"
              >
                {{ row.time }}
                <template v-if="row.mine && row.message.id === lastMineId">
                  ·
                  <template v-if="lastMineRead">
                    <CheckCheck class="size-3.5 text-brand-600" /> Lu
                  </template>
                  <template v-else> <Check class="size-3.5" /> Envoyé </template>
                </template>
              </p>
            </div>
          </div>
        </template>

        <!-- "écrit…" -->
        <div v-if="typing" class="mt-3 flex items-end gap-2" aria-live="polite">
          <span
            class="grid size-7 place-items-center rounded-full bg-sunset text-xs font-bold text-white"
            >{{ initial }}</span
          >
          <span class="flex gap-1 rounded-3xl bg-stone-100 px-4 py-3" aria-label="écrit…">
            <span class="size-2 animate-bounce rounded-full bg-stone-400 [animation-delay:-0.3s]" />
            <span
              class="size-2 animate-bounce rounded-full bg-stone-400 [animation-delay:-0.15s]"
            />
            <span class="size-2 animate-bounce rounded-full bg-stone-400" />
          </span>
        </div>
      </template>
    </div>

    <!-- Closed conversation -->
    <div
      v-if="conversation?.blocked"
      class="border-t border-stone-200 bg-stone-50 px-4 py-3 text-center text-sm text-muted"
    >
      <template v-if="side === 'customer'">
        Cet établissement a fermé la conversation : tu ne peux plus lui écrire.
      </template>
      <template v-else>
        Vous avez fermé cette conversation : le client ne peut plus vous écrire.
        <button
          type="button"
          class="ml-1 font-semibold text-brand-700 underline"
          @click="toggleBlock"
        >
          Rouvrir
        </button>
      </template>
    </div>

    <!-- Composer -->
    <form
      v-else
      class="relative border-t border-stone-200 bg-white px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      @submit.prevent="send"
    >
      <p
        v-if="pendingContext"
        class="mb-2 flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-1.5 text-xs text-brand-800"
      >
        <span class="flex-1 truncate"
          >À propos de : <strong>{{ pendingContext.title }}</strong></span
        >
        <button type="button" aria-label="Retirer" @click="contextSent = true">
          <X class="size-3.5" />
        </button>
      </p>
      <div v-if="file" class="mb-2 flex items-center gap-3 rounded-xl bg-stone-100 p-2">
        <img v-if="preview" :src="preview" alt="" class="size-14 rounded-lg object-cover" />
        <FileText v-else class="size-8 text-brand-600" />
        <span class="min-w-0 flex-1 truncate text-sm">{{ file.name }}</span>
        <button
          type="button"
          class="grid size-8 place-items-center rounded-full hover:bg-stone-200"
          aria-label="Retirer le fichier"
          @click="clearFile()"
        >
          <X class="size-4" />
        </button>
      </div>
      <p v-if="pickError" class="mb-2 px-1 text-sm text-red-600">{{ pickError }}</p>

      <div v-if="emojiOpen" class="absolute bottom-full left-2 z-10 mb-2">
        <EmojiPicker @pick="insertEmoji" />
      </div>

      <div class="flex items-end gap-1">
        <button
          type="button"
          class="grid size-10 shrink-0 place-items-center rounded-full text-brand-600 transition hover:bg-stone-100"
          aria-label="Joindre une photo ou un PDF"
          title="Photo ou PDF"
          @click="fileInput?.click()"
        >
          <Paperclip class="size-5" />
        </button>
        <input
          ref="fileInput"
          type="file"
          class="hidden"
          accept="image/*,application/pdf"
          @change="pickFile"
        />
        <div class="flex min-w-0 flex-1 items-end rounded-3xl bg-stone-100">
          <textarea
            ref="textarea"
            v-model="text"
            rows="1"
            :maxlength="MAX_TEXT"
            class="max-h-36 min-h-10 flex-1 resize-none border-0 bg-transparent py-2 pr-2 pl-4 text-base leading-6 focus:ring-0 focus:outline-none"
            :placeholder="say('Écris ton message…', 'Votre réponse…')"
            aria-label="Message"
            @input="onInput"
            @keydown="onKeydown"
            @focus="emojiOpen = false"
          />
          <button
            type="button"
            class="hidden size-10 shrink-0 place-items-center rounded-full text-brand-600 transition hover:bg-stone-200 sm:grid"
            aria-label="Emojis"
            :aria-expanded="emojiOpen"
            @click="emojiOpen = !emojiOpen"
          >
            <Smile class="size-5" />
          </button>
        </div>
        <button
          type="submit"
          class="grid size-10 shrink-0 place-items-center rounded-full text-brand-600 transition hover:bg-stone-100 disabled:text-stone-300"
          :disabled="!canSend"
          aria-label="Envoyer"
        >
          <SendHorizontal class="size-6" />
        </button>
      </div>
    </form>

    <!-- Report -->
    <div
      v-if="reporting"
      class="fixed inset-0 z-50 grid place-items-end bg-night-950/60 p-3 sm:place-items-center"
      @click.self="reporting = false"
    >
      <form class="w-full max-w-md space-y-3 rounded-3xl bg-white p-5" @submit.prevent="report">
        <h2 class="font-display text-lg font-bold">Signaler cette conversation</h2>
        <p class="text-sm text-muted">
          L’équipe KiffUp lira cette conversation pour vérifier ce qui s’est passé.
        </p>
        <textarea
          v-model="reportReason"
          rows="3"
          class="input"
          placeholder="Que s’est-il passé ?"
          maxlength="500"
        />
        <p v-if="reportError" class="input-error">{{ reportError }}</p>
        <div class="flex justify-end gap-2">
          <button type="button" class="btn-ghost" @click="reporting = false">Annuler</button>
          <button type="submit" class="btn-primary">Signaler</button>
        </div>
      </form>
    </div>

    <!-- Full-size photo -->
    <div
      v-if="lightbox"
      class="fixed inset-0 z-50 grid place-items-center bg-black/90 p-4"
      @click="lightbox = null"
    >
      <img :src="lightbox" alt="" class="max-h-full max-w-full rounded-xl object-contain" />
      <button
        type="button"
        class="absolute top-4 right-4 grid size-10 place-items-center rounded-full bg-white/15 text-white"
        aria-label="Fermer"
      >
        <X class="size-5" />
      </button>
    </div>
  </div>
</template>

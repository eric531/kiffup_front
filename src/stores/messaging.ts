import { ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '@/lib/api'
import { realtime, realtimeConnected } from '@/lib/realtime'
import type { ConversationReadEvent, MessagePostedEvent, MessagingSide } from '@/types/messaging'

/**
 * Inbox of the logged-in customer or partner (lot F9): unread badge of the menus, and the real-time
 * events shared by the open conversation. One subscription per session, whatever the page.
 */
export const useMessagingStore = defineStore('messaging', () => {
  const unread = ref(0)
  /** Conversation on screen: its new messages are read at once, the badge does not move. */
  const openConversation = ref<number | null>(null)
  const side = ref<MessagingSide | null>(null)
  let channel: string | null = null
  let presence: string | null = null
  let poll: ReturnType<typeof setInterval> | undefined
  const postedHandlers = new Set<(event: MessagePostedEvent) => void>()
  const readHandlers = new Set<(event: ConversationReadEvent) => void>()

  const base = () =>
    side.value === 'partner' ? '/api/v1/partner/conversations' : '/api/v1/customer/conversations'

  async function refresh() {
    if (!side.value) return
    try {
      unread.value = (await api.get<{ data: { unread: number } }>(`${base()}/unread`)).data.unread
    } catch {
      // badge only: the next refresh will tell
    }
  }

  /** Starts listening for this customer (its id) or partner (the partner's id). Idempotent. */
  function start(newSide: MessagingSide, ownerId: number) {
    const name = `messaging.${newSide}.${ownerId}`
    if (channel === name) return
    stop()
    side.value = newSide
    channel = name
    void refresh()
    realtime()
      ?.private(name)
      .listen('.message.posted', (event: MessagePostedEvent) => {
        const onScreen =
          event.conversation_id === openConversation.value && document.visibilityState === 'visible'
        if (event.message.sender !== newSide && !onScreen) unread.value++
        postedHandlers.forEach((handler) => handler(event))
      })
      .listen('.conversation.read', (event: ConversationReadEvent) => {
        if (event.side === newSide) void refresh()
        readHandlers.forEach((handler) => handler(event))
      })
    // "En ligne" for the other side of my conversations, while I am on KiffUp (like Messenger).
    presence = `messaging.online.${newSide}.${ownerId}`
    realtime()?.join(presence)
    // Without WebSocket (blocked network, server down): the badge is refreshed every 30 s.
    poll = setInterval(() => {
      if (!realtimeConnected()) void refresh()
    }, 30_000)
  }

  function stop() {
    if (channel) realtime()?.leave(channel)
    if (presence) realtime()?.leave(presence)
    presence = null
    clearInterval(poll)
    channel = null
    side.value = null
    unread.value = 0
  }

  function onPosted(handler: (event: MessagePostedEvent) => void): () => void {
    postedHandlers.add(handler)
    return () => postedHandlers.delete(handler)
  }

  function onRead(handler: (event: ConversationReadEvent) => void): () => void {
    readHandlers.add(handler)
    return () => readHandlers.delete(handler)
  }

  return { unread, side, openConversation, start, stop, refresh, onPosted, onRead }
})

import { onBeforeUnmount, onMounted, ref } from 'vue'
import { api } from '@/lib/api'
import { useMessagingStore } from '@/stores/messaging'
import type { ConversationSummary, MessagingSide } from '@/types/messaging'

/** Inbox of the customer or the partner, kept up to date by the real-time events (lot F9). */
export function useConversations(side: MessagingSide) {
  const store = useMessagingStore()
  const conversations = ref<ConversationSummary[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)
  const base =
    side === 'partner' ? '/api/v1/partner/conversations' : '/api/v1/customer/conversations'

  async function load() {
    try {
      conversations.value = (await api.get<{ data: ConversationSummary[] }>(base)).data
      error.value = null
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Chargement impossible.'
    } finally {
      loading.value = false
    }
  }

  let timer: ReturnType<typeof setTimeout> | undefined
  const reload = () => {
    clearTimeout(timer)
    timer = setTimeout(load, 300)
  }
  const offPosted = store.onPosted(reload)
  const offRead = store.onRead(reload)
  const poll = setInterval(load, 30_000)

  onMounted(load)
  onBeforeUnmount(() => {
    offPosted()
    offRead()
    clearTimeout(timer)
    clearInterval(poll)
  })

  return { conversations, loading, error, load }
}

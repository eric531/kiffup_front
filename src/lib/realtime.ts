import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import { api } from '@/lib/api'

/**
 * WebSocket connection of Messaging (Laravel Reverb), opened on first use. Private channels are
 * authorised by the API with the session cookies. Without VITE_REVERB_APP_KEY (or when the socket
 * is down) the pages fall back to polling: real time is a comfort, never a requirement.
 */
let echo: Echo<'reverb'> | null = null

export function realtime(): Echo<'reverb'> | null {
  const key = import.meta.env.VITE_REVERB_APP_KEY as string | undefined
  if (!key || typeof window === 'undefined') return null
  if (echo) return echo

  const secure = window.location.protocol === 'https:'
  const port = Number(
    import.meta.env.VITE_REVERB_PORT || window.location.port || (secure ? 443 : 80),
  )
  echo = new Echo({
    broadcaster: 'reverb',
    key,
    wsHost: (import.meta.env.VITE_REVERB_HOST as string | undefined) || window.location.hostname,
    wsPort: port,
    wssPort: port,
    forceTLS: secure,
    enabledTransports: ['ws', 'wss'],
    Pusher,
    authorizer: (channel: { name: string }) => ({
      authorize: (
        socketId: string,
        callback: (error: Error | null, data: { auth: string } | null) => void,
      ) => {
        api
          .post<{ auth: string }>('/api/v1/broadcasting/auth', {
            socket_id: socketId,
            channel_name: channel.name,
          })
          .then((data) => callback(null, data))
          .catch((error: Error) => callback(error, null))
      },
    }),
  })
  return echo
}

/** True while the WebSocket is open (otherwise the pages poll). */
export function realtimeConnected(): boolean {
  const connector = echo?.connector as { pusher?: { connection?: { state?: string } } } | undefined
  return connector?.pusher?.connection?.state === 'connected'
}

/** Logout: the next user must not inherit the channels. */
export function disconnectRealtime(): void {
  echo?.disconnect()
  echo = null
}

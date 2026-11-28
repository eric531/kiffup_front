import { computed, ref } from 'vue'

/**
 * Installing KiffUp on the phone's home screen (PWA). Android/Chrome: the browser's own install
 * dialog, offered through "beforeinstallprompt". iPhone: no such dialog, the user goes through
 * "Partager › Sur l'écran d'accueil". Hidden once installed, or for two weeks after "Plus tard".
 */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'kiffup-install-dismissed'
const DISMISS_DAYS = 14

const deferred = ref<InstallPromptEvent | null>(null)
const installed = ref(false)
const dismissedAt = ref<number>(readDismissed())

function readDismissed(): number {
  try {
    return Number(localStorage.getItem(DISMISS_KEY) ?? 0)
  } catch {
    return 0
  }
}

const standalone =
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true)

const ios =
  typeof navigator !== 'undefined' &&
  /iphone|ipad|ipod/i.test(navigator.userAgent) &&
  !/crios|fxios|edgios/i.test(navigator.userAgent)

// Listened to from the start (App.vue imports this module): the event comes early.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferred.value = event as InstallPromptEvent
  })
  window.addEventListener('appinstalled', () => {
    installed.value = true
    deferred.value = null
  })
}

export function useInstallApp() {
  const snoozed = computed(() => Date.now() - dismissedAt.value < DISMISS_DAYS * 86_400_000)
  /** Android/Chrome: one tap opens the install dialog. */
  const canPrompt = computed(() => !!deferred.value && !installed.value)
  /** iPhone (Safari): explain "Partager › Sur l'écran d'accueil". */
  const iosHint = computed(() => ios && !standalone && !installed.value)
  const available = computed(() => !standalone && (canPrompt.value || iosHint.value))
  const showBanner = computed(() => available.value && !snoozed.value)

  async function install(): Promise<void> {
    const event = deferred.value
    if (!event) return
    await event.prompt()
    const choice = await event.userChoice
    deferred.value = null
    if (choice.outcome === 'accepted') installed.value = true
  }

  function dismiss() {
    dismissedAt.value = Date.now()
    try {
      localStorage.setItem(DISMISS_KEY, String(dismissedAt.value))
    } catch {
      // Private browsing: the banner simply comes back next time.
    }
  }

  return { available, canPrompt, iosHint, showBanner, install, dismiss }
}

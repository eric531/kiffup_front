<script setup lang="ts">
import { Share, SquarePlus, X } from 'lucide-vue-next'
import { useInstallApp } from '@/composables/useInstallApp'

/** Phones: invitation to put KiffUp on the home screen, above the tab bar. */
const { showBanner, canPrompt, iosHint, install, dismiss } = useInstallApp()
</script>

<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="translate-y-4 opacity-0"
    leave-active-class="transition duration-200 ease-in"
    leave-to-class="translate-y-4 opacity-0"
  >
    <aside
      v-if="showBanner"
      class="fixed inset-x-3 bottom-[calc(var(--tabbar)+0.75rem)] z-30 flex items-start gap-3 rounded-3xl bg-white p-3.5 text-ink shadow-lift ring-1 ring-stone-200 md:hidden"
      aria-label="Installer l’application"
    >
      <img src="/icons/icon-192.png" alt="" class="size-11 shrink-0 rounded-2xl" />
      <div class="min-w-0 flex-1 text-sm">
        <p class="font-semibold">Installe l’application KiffUp</p>
        <p v-if="canPrompt" class="text-xs text-muted">
          Sur ton écran d’accueil, en plein écran, plus rapide.
        </p>
        <p v-else-if="iosHint" class="text-xs text-muted">
          Touche <Share class="inline size-3.5 -translate-y-px" /> Partager, puis
          <SquarePlus class="inline size-3.5 -translate-y-px" /> « Sur l’écran d’accueil ».
        </p>
        <button
          v-if="canPrompt"
          type="button"
          class="btn-primary mt-2 px-4 py-1.5 text-xs"
          @click="install"
        >
          Installer
        </button>
      </div>
      <button
        type="button"
        class="grid size-8 shrink-0 place-items-center rounded-full text-stone-500 hover:bg-stone-100"
        aria-label="Plus tard"
        @click="dismiss"
      >
        <X class="size-4" />
      </button>
    </aside>
  </Transition>
</template>

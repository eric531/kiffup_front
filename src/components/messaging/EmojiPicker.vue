<script setup lang="ts">
/**
 * Small emoji panel for computers (phones have emojis on their keyboard). No library: the most used
 * ones in a conversation with a hotel, a spa or a restaurant.
 */
const emit = defineEmits<{ pick: [emoji: string] }>()

const EMOJIS = [
  '😀',
  '😂',
  '🥰',
  '😍',
  '😊',
  '😉',
  '😎',
  '🤩',
  '🙏',
  '👍',
  '👌',
  '👏',
  '🙌',
  '💪',
  '🤝',
  '👋',
  '❤️',
  '🔥',
  '✨',
  '🎉',
  '🥳',
  '💯',
  '✅',
  '❓',
  '😅',
  '🤔',
  '😢',
  '😮',
  '😴',
  '🙈',
  '🤗',
  '😇',
  '🏨',
  '🛏️',
  '🚗',
  '🅿️',
  '💆',
  '💅',
  '🍽️',
  '🍹',
  '🏖️',
  '🌴',
  '☀️',
  '🌙',
  '🎶',
  '📍',
  '📅',
  '⏰',
]
</script>

<template>
  <div
    class="grid grid-cols-8 gap-0.5 rounded-2xl border border-stone-200 bg-white p-2 shadow-xl"
    role="listbox"
    aria-label="Emojis"
  >
    <button
      v-for="emoji in EMOJIS"
      :key="emoji"
      type="button"
      class="grid size-9 place-items-center rounded-xl text-xl transition hover:bg-stone-100 active:scale-90"
      role="option"
      :aria-label="emoji"
      @click="emit('pick', emoji)"
    >
      {{ emoji }}
    </button>
  </div>
</template>

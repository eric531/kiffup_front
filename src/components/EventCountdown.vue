<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { countdownTo } from '@/lib/format'

const props = withDefaults(defineProps<{ startsAt: string; size?: 'lg' | 'sm' }>(), { size: 'lg' })

const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => (timer = setInterval(() => (now.value = Date.now()), 1000)))
onBeforeUnmount(() => clearInterval(timer))

const countdown = computed(() => countdownTo(props.startsAt, now.value))
const units = computed(() => [
  { value: countdown.value.days, label: 'jours' },
  { value: countdown.value.hours, label: 'heures' },
  { value: countdown.value.minutes, label: 'min' },
  { value: countdown.value.seconds, label: 'sec' },
])
const pad = (n: number) => String(n).padStart(2, '0')
</script>

<template>
  <div
    v-if="!countdown.finished"
    class="flex"
    :class="size === 'lg' ? 'gap-2.5 sm:gap-3' : 'gap-1.5'"
    role="timer"
    :aria-label="`Début dans ${countdown.days} jours ${countdown.hours} heures`"
  >
    <div
      v-for="unit in units"
      :key="unit.label"
      class="glass overflow-hidden rounded-2xl text-center text-white"
      :class="size === 'lg' ? 'min-w-[4.5rem] px-3 py-3 sm:min-w-20' : 'min-w-12 px-2 py-1.5'"
    >
      <!-- Each digit change slides in from below -->
      <div
        class="relative font-display font-bold tabular-nums"
        :class="size === 'lg' ? 'h-9 text-3xl sm:h-10 sm:text-4xl' : 'h-6 text-lg'"
      >
        <Transition
          enter-active-class="transition duration-300 ease-out"
          enter-from-class="translate-y-full opacity-0"
          leave-active-class="absolute inset-x-0 transition duration-300 ease-in"
          leave-to-class="-translate-y-full opacity-0"
        >
          <span :key="unit.value" class="block">{{ pad(unit.value) }}</span>
        </Transition>
      </div>
      <div
        class="uppercase tracking-wider text-white/60"
        :class="size === 'lg' ? 'mt-1 text-[0.65rem]' : 'text-[0.55rem]'"
      >
        {{ unit.label }}
      </div>
    </div>
  </div>
  <p v-else class="chip bg-white/15 text-white">L'événement a commencé 🎶</p>
</template>

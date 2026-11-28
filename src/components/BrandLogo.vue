<script setup lang="ts">
import { useId } from 'vue'

/**
 * KiffUp logo: the mark (K, the pin at its joint and the orange ring, on violet) and the name.
 * Same drawing as the app icons (public/icons/icon.svg).
 */
withDefaults(defineProps<{ light?: boolean }>(), { light: true })
// Gradient ids unique per logo on the page (several logos can be shown at once).
const id = useId()
</script>

<template>
  <span class="inline-flex items-center gap-2 font-display text-xl font-extrabold tracking-tight">
    <svg
      viewBox="0 0 100 100"
      class="size-8 shrink-0 drop-shadow-[0_6px_14px_rgb(124_58_237_/_0.45)]"
      aria-hidden="true"
    >
      <defs>
        <linearGradient :id="`${id}-bg`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#a21caf" />
          <stop offset=".45" stop-color="#7c3aed" />
          <stop offset="1" stop-color="#3b0f8c" />
        </linearGradient>
        <linearGradient :id="`${id}-or`" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#fb923c" />
          <stop offset="1" stop-color="#f97316" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="23" :fill="`url(#${id}-bg)`" />
      <path
        d="M13 69 C 30 90, 70 88, 89 55"
        fill="none"
        :stroke="`url(#${id}-or)`"
        stroke-width="7.5"
        stroke-linecap="round"
      />
      <g fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round" stroke-linejoin="round">
        <path d="M36 23 V 72" />
        <path d="M67 24 L 39 51" />
        <path d="M48 46 L 69 71" />
      </g>
      <g transform="translate(36 60)">
        <path
          d="M0 -11 C -6.6 -11 -11 -6.4 -11 -0.6 C -11 6.4 0 15 0 15 C 0 15 11 6.4 11 -0.6 C 11 -6.4 6.6 -11 0 -11 Z"
          :fill="`url(#${id}-or)`"
          stroke="#4c1d95"
          stroke-width="2.2"
        />
        <circle cy="-0.8" r="3.6" fill="#fff" />
      </g>
    </svg>
    <span :class="light ? 'text-white' : 'text-ink'"
      >Kiff<span class="text-brand-500">Up</span></span
    >
  </span>
</template>

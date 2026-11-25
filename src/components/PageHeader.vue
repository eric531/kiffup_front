<script setup lang="ts">
import type { Component } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'

/** Title block of the partner and back-office pages: optional back link, icon and actions. */
defineProps<{
  title: string
  subtitle?: string
  icon?: Component
  back?: { to: RouteLocationRaw; label: string }
}>()
</script>

<template>
  <header class="animate-fade-up space-y-3">
    <RouterLink
      v-if="back"
      :to="back.to"
      class="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-brand-700"
    >
      <ArrowLeft class="size-4" /> {{ back.label }}
    </RouterLink>
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex min-w-0 items-center gap-4">
        <span
          v-if="icon"
          class="grid size-12 shrink-0 place-items-center rounded-2xl bg-sunset text-white shadow-glow"
        >
          <component :is="icon" class="size-6" />
        </span>
        <div class="min-w-0">
          <h1 class="truncate text-2xl font-extrabold sm:text-3xl">{{ title }}</h1>
          <p v-if="subtitle" class="mt-0.5 text-sm text-muted">{{ subtitle }}</p>
        </div>
      </div>
      <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{ label: string; for: string; error?: string; hint?: string }>()
</script>

<template>
  <div>
    <label class="label" :for="$props.for">{{ label }}</label>
    <slot />
    <p v-if="error" class="input-error">{{ error }}</p>
    <p v-else-if="hint" class="mt-1 text-xs text-muted">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import ChatThread from '@/components/messaging/ChatThread.vue'

/** A conversation with a customer (lot F9). */
const props = defineProps<{ conversationId: string }>()
</script>

<template>
  <div class="h-full min-h-0">
    <ChatThread
      side="partner"
      :conversation-id="Number(props.conversationId)"
      :back="{ name: 'partner.messages' }"
    />
  </div>
</template>

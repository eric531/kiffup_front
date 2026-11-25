<script setup lang="ts">
import { ref, watch } from 'vue'
import { Clock3 } from 'lucide-vue-next'
import { api } from '@/lib/api'
import { useForm } from '@/composables/useForm'
import { usePartnerProfile } from '@/composables/usePartnerProfile'
import PageHeader from '@/components/PageHeader.vue'
import OpeningHoursEditor from '@/components/OpeningHoursEditor.vue'
import type { OpeningRange, Partner } from '@/types/catalog'

/** The partner keeps its opening hours and closing days up to date (V3, lot F4). */
const { partner, load } = usePartnerProfile()
const hours = ref<OpeningRange[]>([])
const closedDates = ref<string[]>([])
const form = useForm()
const saved = ref(false)

watch(
  partner,
  (value) => {
    hours.value = value?.opening_hours ?? []
    closedDates.value = value?.closed_dates ?? []
  },
  { immediate: true },
)
load()

async function save() {
  saved.value = false
  const result = await form.submit(() =>
    api.put<{ data: Partner }>('/api/v1/partner/opening-hours', {
      opening_hours: hours.value,
      closed_dates: closedDates.value,
    }),
  )
  if (!result) return
  partner.value = result.data
  saved.value = true
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Mes horaires"
      subtitle="Vos clients demandent une séance uniquement pendant vos heures d'ouverture."
      :icon="Clock3"
    />

    <form class="card max-w-2xl space-y-5 p-6" @submit.prevent="save">
      <div v-if="saved" class="alert-success">Horaires enregistrés.</div>
      <div v-if="form.error.value" class="alert-error">{{ form.error.value }}</div>
      <p v-if="partner && !hours.length" class="alert-info">
        Aucun jour d'ouverture : vos séances ne peuvent pas être demandées tant que vous n'avez pas
        indiqué vos horaires.
      </p>

      <OpeningHoursEditor
        v-model:hours="hours"
        v-model:closed-dates="closedDates"
        :errors="form.fieldErrors.value"
      />

      <button class="btn-primary" type="submit" :disabled="form.processing.value">
        Enregistrer mes horaires
      </button>
    </form>
  </div>
</template>

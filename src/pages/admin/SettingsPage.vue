<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { api } from '@/lib/api'
import { useForm } from '@/composables/useForm'
import TierEditor from '@/components/TierEditor.vue'
import type { PricingTier } from '@/types/catalog'
import { SETTING_GROUP_LABELS, type Setting, type SettingChange } from '@/types/settings'
import { History, Save, Settings } from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import ListSkeleton from '@/components/ListSkeleton.vue'

const settings = ref<Setting[]>([])
const values = ref<Record<string, unknown>>({})
const history = ref<SettingChange[]>([])
const saved = ref(false)
const loading = ref(true)
const form = useForm()

const unitSuffix: Record<string, string> = {
  bp: '%',
  days: 'jours',
  hours: 'heures',
  hour: 'h',
  minutes: 'minutes',
  units: 'unités',
  xof: 'FCFA',
  seconds: 'secondes',
  mb: 'Mo',
  count: '',
}

const groups = computed(() => {
  const byGroup = new Map<Setting['group'], Setting[]>()
  for (const setting of settings.value) {
    byGroup.set(setting.group, [...(byGroup.get(setting.group) ?? []), setting])
  }
  return [...byGroup.entries()]
})

const dirtyKeys = computed(() =>
  settings.value
    .filter((s) => JSON.stringify(values.value[s.key]) !== JSON.stringify(s.value))
    .map((s) => s.key),
)

function load(data: Setting[]) {
  settings.value = data
  values.value = Object.fromEntries(data.map((s) => [s.key, structuredClone(s.value)]))
}

async function loadHistory() {
  history.value = (
    await api.get<{ data: SettingChange[] }>('/api/v1/admin/settings/history', { limit: 20 })
  ).data
}

onMounted(async () => {
  try {
    load((await api.get<{ data: Setting[] }>('/api/v1/admin/settings')).data)
    await loadHistory()
  } finally {
    loading.value = false
  }
})

/** Displayed value: basis points as a percentage, everything else as is. */
function displayValue(setting: Setting): number {
  const value = Number(values.value[setting.key])
  return setting.unit === 'bp' ? value / 100 : value
}

function setValue(setting: Setting, input: string) {
  const value = Number(input)
  values.value[setting.key] = setting.unit === 'bp' ? Math.round(value * 100) : value
}

function tiersOf(key: string): PricingTier[] {
  return values.value[key] as PricingTier[]
}

function formatValue(value: unknown, key: string): string {
  const setting = settings.value.find((s) => s.key === key)
  if (Array.isArray(value)) {
    return value.length === 0
      ? 'aucun palier'
      : (value as PricingTier[])
          .map(
            (t) =>
              `J-${t.days_before} ${t.markup_bp === null ? 'fermé' : `+${t.markup_bp / 100} %`}`,
          )
          .join(', ')
  }
  if (setting?.unit === 'bp') return `${Number(value) / 100} %`
  if (setting?.unit === 'bool') return value ? 'activé' : 'désactivé'
  return `${value} ${setting ? (unitSuffix[setting.unit] ?? '') : ''}`
}

async function save() {
  saved.value = false
  const changes = Object.fromEntries(dirtyKeys.value.map((key) => [key, values.value[key]]))
  const result = await form.submit(() =>
    api.put<{ data: Setting[] }>('/api/v1/admin/settings', { settings: changes }),
  )
  if (result) {
    load(result.data)
    saved.value = true
    await loadHistory()
  }
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Paramètres"
      subtitle="Commissions, paliers de prix et règles d'annulation. Appliqués immédiatement."
      :icon="Settings"
    />

    <div v-if="saved" class="alert-success">
      Paramètres enregistrés. Ils s'appliquent immédiatement.
    </div>
    <div v-if="form.error.value" class="alert-error">{{ form.error.value }}</div>
    <ListSkeleton v-if="loading && settings.length === 0" :rows="3" />

    <section v-for="[group, items] in groups" :key="group" v-reveal class="card space-y-5 p-6">
      <h2 class="section-title">{{ SETTING_GROUP_LABELS[group] }}</h2>

      <div
        v-for="setting in items"
        :key="setting.key"
        class="space-y-2 border-t border-stone-100 pt-5 first-of-type:border-t-0 first-of-type:pt-0"
      >
        <label class="label" :for="setting.key">{{ setting.label }}</label>
        <p class="text-xs text-muted">{{ setting.help }}</p>

        <TierEditor
          v-if="setting.unit === 'tiers'"
          :model-value="tiersOf(setting.key)"
          @update:model-value="values[setting.key] = $event"
          :error="form.fieldErrors.value[setting.key]"
        />
        <label v-else-if="setting.unit === 'bool'" class="flex items-center gap-2 text-sm">
          <input
            :id="setting.key"
            type="checkbox"
            class="size-5 accent-brand-600"
            :checked="Boolean(values[setting.key])"
            @change="values[setting.key] = ($event.target as HTMLInputElement).checked"
          />
          {{ values[setting.key] ? 'Activé' : 'Désactivé' }}
        </label>
        <template v-else>
          <div class="flex items-center gap-2">
            <input
              :id="setting.key"
              class="input w-32"
              type="number"
              min="0"
              :step="setting.unit === 'bp' ? 0.5 : 1"
              :value="displayValue(setting)"
              @input="setValue(setting, ($event.target as HTMLInputElement).value)"
            />
            <span class="text-sm text-muted">{{ unitSuffix[setting.unit] }}</span>
          </div>
          <p v-if="form.fieldError(setting.key)" class="input-error">
            {{ form.fieldError(setting.key) }}
          </p>
        </template>
        <p
          v-if="setting.unit === 'tiers' && tiersOf(setting.key).length === 0"
          class="text-xs text-amber-700"
        >
          Sans palier, le prix ne change pas à l'approche de l'événement.
        </p>
      </div>
    </section>

    <section v-reveal class="card space-y-3 p-6">
      <h2 class="section-title flex items-center gap-2">
        <History class="size-5 text-muted" /> Dernières modifications
      </h2>
      <p v-if="history.length === 0" class="text-sm text-muted">
        Aucune modification pour le moment.
      </p>
      <ul v-else class="divide-y divide-stone-200 text-sm">
        <li v-for="change in history" :key="change.id" class="py-2">
          <p>
            <strong>{{ change.label }}</strong> : {{ formatValue(change.old_value, change.key) }} →
            {{ formatValue(change.new_value, change.key) }}
          </p>
          <p class="text-xs text-muted">
            {{ change.changed_by ?? 'Système' }} ·
            {{ new Date(change.created_at).toLocaleString('fr-FR') }}
          </p>
        </li>
      </ul>
    </section>

    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="translate-y-6 opacity-0"
      leave-active-class="transition duration-200"
      leave-to-class="translate-y-6 opacity-0"
    >
      <div
        v-if="dirtyKeys.length"
        class="sticky bottom-[calc(var(--tabbar)+1rem)] z-20 mx-auto flex w-fit items-center gap-4 rounded-full bg-night-950 py-2 pr-2 pl-5 text-sm text-white shadow-lift"
      >
        <span
          >{{ dirtyKeys.length }} modification{{ dirtyKeys.length > 1 ? 's' : '' }} non
          enregistrée{{ dirtyKeys.length > 1 ? 's' : '' }}</span
        >
        <button class="btn-primary" :disabled="form.processing.value" @click="save">
          <Save class="size-4" /> Enregistrer
        </button>
      </div>
    </Transition>
  </div>
</template>

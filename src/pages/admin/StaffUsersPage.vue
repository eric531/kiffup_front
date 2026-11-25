<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useForm } from '@/composables/useForm'
import { ROLE_LABELS, type Paginated, type Resource, type Role, type User } from '@/types/identity'
import { Plus, ShieldCheck, ShieldAlert, UsersRound, X } from 'lucide-vue-next'
import PageHeader from '@/components/PageHeader.vue'
import ListSkeleton from '@/components/ListSkeleton.vue'

const auth = useAuthStore()
const users = ref<User[]>([])
const loading = ref(true)
const list = useForm()

const showCreate = ref(false)
const created = ref<string | null>(null)
const create = useForm()
const form = reactive({ name: '', email: '', phone: '', role: 'admin' as Role })

const staffRoles: Role[] = ['admin', 'super_admin']

async function load() {
  loading.value = true
  await list.submit(async () => {
    const response = await api.get<Paginated<User>>('/api/v1/admin/staff-users', { per_page: 100 })
    users.value = response.data
  })
  loading.value = false
}

async function createUser() {
  created.value = null
  const user = await create.submit(async () => {
    const response = await api.post<Resource<User>>('/api/v1/admin/staff-users', {
      ...form,
      email: form.email || null,
    })
    return response.data
  })
  if (user) {
    users.value = [...users.value, user].sort((a, b) => a.name.localeCompare(b.name))
    created.value = `${user.name} a reçu un message WhatsApp pour choisir son mot de passe.`
    Object.assign(form, { name: '', email: '', phone: '', role: 'admin' })
    showCreate.value = false
  }
}

async function update(user: User, changes: Partial<Pick<User, 'is_active'>> & { role?: Role }) {
  await list.submit(async () => {
    const response = await api.patch<Resource<User>>(
      `/api/v1/admin/staff-users/${user.id}`,
      changes,
    )
    users.value = users.value.map((u) => (u.id === user.id ? response.data : u))
  })
}

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Comptes administrateurs"
      subtitle="Les personnes qui ont accès au back-office."
      :icon="UsersRound"
    >
      <template #actions>
        <button
          :class="showCreate ? 'btn-secondary' : 'btn-primary'"
          @click="showCreate = !showCreate"
        >
          <component :is="showCreate ? X : Plus" class="size-4" />
          {{ showCreate ? 'Annuler' : 'Nouveau compte' }}
        </button>
      </template>
    </PageHeader>

    <div v-if="created" class="alert-success">{{ created }}</div>
    <div v-if="list.error.value" class="alert-error">{{ list.error.value }}</div>

    <form
      v-if="showCreate"
      class="card grid animate-fade-up gap-5 p-6 sm:grid-cols-2"
      @submit.prevent="createUser"
    >
      <div v-if="create.error.value" class="alert-error sm:col-span-2">
        {{ create.error.value }}
      </div>
      <div>
        <label class="label" for="name">Nom complet</label>
        <input id="name" v-model="form.name" class="input" required />
        <p v-if="create.fieldError('name')" class="input-error">{{ create.fieldError('name') }}</p>
      </div>
      <div>
        <label class="label" for="phone">Numéro de connexion (WhatsApp)</label>
        <input
          id="phone"
          v-model="form.phone"
          class="input"
          type="tel"
          placeholder="07 07 07 07 07 ou +33 6 12 34 56 78"
          required
        />
        <p v-if="create.fieldError('phone')" class="input-error">
          {{ create.fieldError('phone') }}
        </p>
      </div>
      <div>
        <label class="label" for="email">Email (facultatif)</label>
        <input id="email" v-model="form.email" class="input" type="email" />
        <p v-if="create.fieldError('email')" class="input-error">
          {{ create.fieldError('email') }}
        </p>
      </div>
      <div>
        <label class="label" for="role">Rôle</label>
        <select id="role" v-model="form.role" class="input">
          <option v-for="role in staffRoles" :key="role" :value="role">
            {{ ROLE_LABELS[role] }}
          </option>
        </select>
        <p v-if="create.fieldError('role')" class="input-error">{{ create.fieldError('role') }}</p>
      </div>
      <div class="sm:col-span-2">
        <button class="btn-primary" type="submit" :disabled="create.processing.value">
          Créer le compte
        </button>
      </div>
    </form>

    <ListSkeleton v-if="loading" :rows="3" />

    <ul v-else class="space-y-3">
      <li
        v-for="(user, i) in users"
        :key="user.id"
        v-reveal="Math.min(i, 4) * 50"
        class="card flex flex-col gap-4 sm:flex-row sm:items-center"
        :class="{ 'opacity-70': !user.is_active }"
      >
        <span
          class="grid size-12 shrink-0 place-items-center rounded-2xl font-display font-bold"
          :class="
            user.id === auth.user?.id
              ? 'bg-sunset text-white'
              : 'bg-gradient-to-br from-brand-100 to-pink-100 text-brand-800'
          "
        >
          {{
            user.name
              .split(/\s+/)
              .slice(0, 2)
              .map((part) => part.charAt(0).toUpperCase())
              .join('')
          }}
        </span>
        <div class="min-w-0 flex-1">
          <p class="font-semibold">
            {{ user.name }}
            <span v-if="user.id === auth.user?.id" class="text-xs font-normal text-muted"
              >(vous)</span
            >
          </p>
          <p class="truncate text-sm text-muted">
            {{ [user.phone ?? 'aucun numéro', user.email].filter(Boolean).join(' · ') }}
          </p>
          <p class="mt-2 flex flex-wrap gap-2">
            <span :class="user.is_active ? 'badge-success' : 'badge-neutral'">
              {{ user.is_active ? 'Actif' : 'Désactivé' }}
            </span>
            <span :class="user.two_factor_enabled ? 'badge-info' : 'badge-warning'">
              <component
                :is="user.two_factor_enabled ? ShieldCheck : ShieldAlert"
                class="size-3.5"
              />
              {{ user.two_factor_enabled ? '2FA activée' : '2FA non activée' }}
            </span>
          </p>
        </div>
        <div v-if="user.id !== auth.user?.id" class="flex flex-wrap gap-2">
          <select
            class="input w-auto py-2 text-sm"
            :value="user.roles[0]"
            aria-label="Rôle"
            @change="update(user, { role: ($event.target as HTMLSelectElement).value as Role })"
          >
            <option v-for="role in staffRoles" :key="role" :value="role">
              {{ ROLE_LABELS[role] }}
            </option>
          </select>
          <button class="btn-secondary py-2" @click="update(user, { is_active: !user.is_active })">
            {{ user.is_active ? 'Désactiver' : 'Réactiver' }}
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

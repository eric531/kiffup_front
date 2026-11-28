<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { CalendarRange, Clock3, Hourglass, Lock, Minus, Plus, RotateCcw } from 'lucide-vue-next'
import { api, ApiError } from '@/lib/api'
import {
  addDays,
  daysBetween,
  formatEventDate,
  formatRate,
  formatStayRange,
  formatXof,
} from '@/lib/format'
import { saveBookingToken } from '@/lib/bookingTokens'
import { firstSessionDay, formatSessionDate, openingLines, sessionSlots } from '@/lib/sessions'
import { discoveryOrigin, forgetDiscoveryOrigin } from '@/lib/discoveryOrigin'
import { useAuthStore } from '@/stores/auth'
import { useForm } from '@/composables/useForm'
import FormField from '@/components/FormField.vue'
import PriceDetail from '@/components/PriceDetail.vue'
import PaymentMethodPicker from '@/components/PaymentMethodPicker.vue'
import { PHONE_COUNTRIES, type Booking, type BookingQuote } from '@/types/booking'
import {
  durationLabel,
  type EventPackage,
  type Listing,
  type PricingUnit,
  type SessionRules,
  type StayRules,
} from '@/types/catalog'

/**
 * Order form for one tariff of a listing: the event package of an event (fixed nights),
 * a stay per night / per day with dates chosen by the customer, or a session (day and time inside the
 * opening hours, confirmed by the partner).
 * Re-mount it (key) when the tariff changes.
 */
const props = defineProps<{
  listing: Listing
  pricingUnit: PricingUnit
  /** Event package: the event and its package. */
  eventId?: number | null
  pkg?: EventPackage | null
  /** Per night / per day: bookable dates (pre-selected on the event day on an event page). */
  rules?: StayRules | null
  /** Session: length, bookable days and opening hours. */
  sessionRules?: SessionRules | null
}>()

const quantity = ref(1)
const quote = ref<BookingQuote | null>(null)
const quoteError = ref<{ field: string; message: string } | null>(null)

// Per night / per day: the customer picks dates (pre-selected). The event package has fixed nights.
const stay = computed(() => (props.pricingUnit === 'stay' ? null : (props.rules ?? null)))
const nightly = computed(() => props.pricingUnit === 'night')
// v-model:starts-on / v-model:ends-on (optional): the availability calendar of the page can pick them.
const startsOn = defineModel<string>('startsOn', { default: '' })
const endsOn = defineModel<string>('endsOn', { default: '' })
if (props.rules && (!startsOn.value || !endsOn.value)) {
  startsOn.value = props.rules.default_starts_on
  endsOn.value = props.rules.default_ends_on
}
const duration = computed(() => {
  if (!stay.value || !startsOn.value || !endsOn.value) return 1
  const days = daysBetween(startsOn.value, endsOn.value)
  return nightly.value ? days : days + 1
})
/** Last day selectable as departure / last day, given the start date and the maximum duration. */
// A bound date model is filled on the next render: until then the dates may be empty.
const endMin = computed(() => {
  if (!startsOn.value) return stay.value?.available_from ?? ''
  const min = stay.value?.min_duration ?? 1
  return addDays(startsOn.value, nightly.value ? min : min - 1)
})
const endMax = computed(() => {
  if (!stay.value) return ''
  const max = stay.value.max_duration
  if (max === null || !startsOn.value) return stay.value.available_until
  const limit = addDays(startsOn.value, nightly.value ? max : max - 1)
  return limit < stay.value.available_until ? limit : stay.value.available_until
})
// Moving the start date keeps the end date valid (minimum duration, window).
watch(startsOn, () => {
  if (!stay.value || !startsOn.value) return
  if (!endsOn.value || endsOn.value < endMin.value) endsOn.value = endMin.value
  if (endsOn.value > endMax.value) endsOn.value = endMax.value
})
// Session (V3): a day, then a start time among the slots of that day.
const session = computed(() =>
  props.pricingUnit === 'session' ? (props.sessionRules ?? null) : null,
)
const sessionDay = ref(session.value ? (firstSessionDay(session.value) ?? '') : '')
const sessionTime = ref('')
const slots = computed(() => (session.value ? sessionSlots(session.value, sessionDay.value) : []))
watch(
  slots,
  (list) => {
    if (!list.includes(sessionTime.value)) sessionTime.value = ''
  },
  { immediate: true },
)
const sessionStartsAt = computed(() =>
  sessionDay.value && sessionTime.value ? `${sessionDay.value}T${sessionTime.value}` : '',
)

const customer = reactive({ name: '', country: 'CI', phone: '', email: '' })

// Logged-in customer (V3): the form is pre-filled from the account; the order joins "Mes réservations".
const auth = useAuthStore()
watch(
  () => auth.user,
  (user) => {
    if (!user || !auth.isCustomer) return
    customer.name ||= user.name
    customer.email ||= user.email ?? ''
    if (!customer.phone && user.phone) {
      // Longest matching prefix first: +1 (Canada / USA) must not hide a longer one.
      const country = [...PHONE_COUNTRIES]
        .sort((a, b) => b.dial.length - a.dial.length)
        .find((c) => user.phone!.startsWith(c.dial))
      customer.country = country?.code ?? 'CI'
      customer.phone = country ? user.phone.slice(country.dial.length) : user.phone
    }
  },
  { immediate: true },
)
const acceptTerms = ref(false)
// Wallet the customer pays with (required by Jèko before paying).
const paymentMethod = ref('')
const paymentMethodRequired = ref(false)
const paymentMethodError = ref<string | null>(null)
const form = useForm()
// One key per order: a double tap, a network retry or the way back from the payment page reuses it
// (the server then resumes the order awaiting payment). A changed order gets a new key.
let idempotencyKey = crypto.randomUUID()
let keyOrder: string | null = null

const maxQuantity = computed(
  () => quote.value?.max_quantity ?? props.listing.max_quantity_per_order ?? 1,
)
const dial = computed(() => PHONE_COUNTRIES.find((c) => c.code === customer.country)?.dial ?? '')

let quoteTimer: ReturnType<typeof setTimeout> | undefined
// Only the latest request counts: on a slow network, an older answer must not overwrite a newer one.
let quoteRequest = 0
async function refreshQuote() {
  if (stay.value && (!startsOn.value || !endsOn.value)) return
  if (session.value && !sessionStartsAt.value) {
    quote.value = null
    return
  }
  const request = ++quoteRequest
  try {
    const fresh = (
      await api.get<{ data: BookingQuote }>('/api/v1/public/bookings/quote', {
        listing_id: props.listing.id,
        pricing_unit: props.pricingUnit,
        event_id: props.pricingUnit === 'stay' ? (props.eventId ?? undefined) : undefined,
        quantity: quantity.value,
        stay_starts_on: stay.value ? startsOn.value : undefined,
        stay_ends_on: stay.value ? endsOn.value : undefined,
        session_starts_at: session.value ? sessionStartsAt.value : undefined,
      })
    ).data
    if (request !== quoteRequest) return
    quote.value = fresh
    quoteError.value = null
    if (quantity.value > fresh.max_quantity && fresh.max_quantity > 0) {
      quantity.value = fresh.max_quantity
    }
  } catch (e) {
    if (request !== quoteRequest) return
    quote.value = null
    // Dates outside the listing rules: the message is shown under the date fields.
    const field = e instanceof ApiError ? Object.keys(e.errors)[0] : undefined
    quoteError.value =
      field && e instanceof ApiError ? { field, message: e.fieldError(field) ?? '' } : null
  }
}
watch(
  [quantity, startsOn, endsOn, sessionStartsAt],
  () => {
    clearTimeout(quoteTimer)
    quoteTimer = setTimeout(refreshQuote, 250)
  },
  { immediate: true },
)

async function submit() {
  paymentMethodError.value = null
  if (paymentMethodRequired.value && !paymentMethod.value) {
    paymentMethodError.value = 'Choisis ton moyen de paiement.'
    return
  }
  const order = {
    listing_id: props.listing.id,
    quantity: quantity.value,
    pricing_unit: props.pricingUnit,
    event_id: props.pricingUnit === 'stay' ? (props.eventId ?? undefined) : undefined,
    stay_starts_on: stay.value ? startsOn.value : undefined,
    stay_ends_on: stay.value ? endsOn.value : undefined,
    session_starts_at: session.value ? sessionStartsAt.value : undefined,
  }
  const signature = JSON.stringify(order)
  if (keyOrder !== null && keyOrder !== signature) idempotencyKey = crypto.randomUUID()
  keyOrder = signature
  const result = await form.submit(() =>
    api.post<{ data: Booking; access_token: string; payment_url: string }>(
      '/api/v1/public/bookings',
      {
        ...order,
        customer: { ...customer },
        accept_terms: acceptTerms.value,
        payment_method: paymentMethod.value || undefined,
        origin_video_id: discoveryOrigin() ?? undefined,
      },
      { 'Idempotency-Key': idempotencyKey },
    ),
  )
  if (!result) {
    // Rejected before any order was created (validation, stock): the next attempt is a new request.
    if (Object.keys(form.fieldErrors.value).length) idempotencyKey = crypto.randomUUID()
    return
  }
  saveBookingToken(result.data.code, result.access_token)
  forgetDiscoveryOrigin()
  window.location.assign(result.payment_url)
}
</script>

<template>
  <form class="space-y-5" @submit.prevent="submit">
    <div v-if="form.error.value" class="alert-error">{{ form.error.value }}</div>

    <fieldset v-if="stay" class="space-y-2">
      <legend class="label flex items-center gap-2">
        <CalendarRange class="size-4 text-brand-600" />
        {{ nightly ? 'Tes nuits' : 'Tes dates' }}
      </legend>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="mb-1 block text-xs text-muted" for="stay_starts_on">
            {{ nightly ? 'Arrivée' : 'Premier jour' }}
          </label>
          <input
            id="stay_starts_on"
            v-model="startsOn"
            class="input px-3"
            type="date"
            :min="stay.available_from"
            :max="nightly ? addDays(stay.available_until, -1) : stay.available_until"
            required
          />
        </div>
        <div>
          <label class="mb-1 block text-xs text-muted" for="stay_ends_on">
            {{ nightly ? 'Départ' : 'Dernier jour' }}
          </label>
          <input
            id="stay_ends_on"
            v-model="endsOn"
            class="input px-3"
            type="date"
            :min="endMin"
            :max="endMax"
            required
          />
        </div>
      </div>
      <p
        v-if="
          (quoteError && quoteError.field.startsWith('stay_')) ||
          form.fieldError('stay_starts_on') ||
          form.fieldError('stay_ends_on')
        "
        class="input-error"
      >
        {{
          form.fieldError('stay_starts_on') ??
          form.fieldError('stay_ends_on') ??
          quoteError?.message
        }}
      </p>
      <p v-else-if="startsOn && endsOn" class="flex items-center gap-2 text-sm">
        <span class="chip bg-brand-50 text-brand-700">{{
          durationLabel(pricingUnit, duration)
        }}</span>
        <span class="text-muted">{{ formatStayRange(startsOn, endsOn) }}</span>
      </p>
    </fieldset>

    <fieldset v-if="session" class="space-y-3">
      <legend class="label flex items-center gap-2">
        <Clock3 class="size-4 text-brand-600" /> Jour et heure souhaités
      </legend>
      <div>
        <label class="mb-1 block text-xs text-muted" for="session_day">Jour</label>
        <input
          id="session_day"
          v-model="sessionDay"
          class="input px-3"
          type="date"
          :min="session.available_from"
          :max="session.available_until"
          required
        />
      </div>
      <div v-if="slots.length" role="radiogroup" aria-label="Heure" class="grid grid-cols-4 gap-2">
        <button
          v-for="slot in slots"
          :key="slot"
          type="button"
          role="radio"
          class="rounded-xl border px-2 py-2 text-sm font-semibold transition"
          :class="
            sessionTime === slot
              ? 'border-brand-600 bg-brand-600 text-white shadow'
              : 'border-stone-200 bg-white hover:border-brand-300'
          "
          :aria-checked="sessionTime === slot"
          @click="sessionTime = slot"
        >
          {{ slot }}
        </button>
      </div>
      <div v-else class="rounded-2xl bg-stone-100 p-3 text-sm">
        <p class="font-semibold">L'établissement est fermé ce jour-là.</p>
        <p class="mt-1 text-muted">
          Ouvert :
          <span v-for="(line, i) in openingLines(session.opening_hours)" :key="line.label"
            >{{ i ? ' · ' : '' }}{{ line.label }} {{ line.range }}</span
          >
        </p>
      </div>
      <p
        v-if="form.fieldError('session_starts_at') || quoteError?.field === 'session_starts_at'"
        class="input-error"
      >
        {{ form.fieldError('session_starts_at') ?? quoteError?.message }}
      </p>
      <p v-else-if="slots.length && !sessionTime" class="text-sm text-muted">Choisis une heure.</p>
    </fieldset>

    <FormField
      :label="session ? 'Nombre de personnes' : 'Quantité'"
      for="quantity"
      :error="form.fieldError('quantity')"
    >
      <div class="flex items-center justify-between gap-3">
        <div
          class="inline-flex items-center rounded-full border border-stone-300 bg-white p-1 shadow-sm"
        >
          <button
            type="button"
            class="grid size-10 place-items-center rounded-full transition hover:bg-stone-100 active:scale-90 disabled:opacity-40"
            :disabled="quantity <= 1"
            aria-label="Diminuer"
            @click="quantity--"
          >
            <Minus class="size-4" />
          </button>
          <input
            id="quantity"
            v-model.number="quantity"
            class="w-12 border-0 bg-transparent text-center font-display text-lg font-bold focus:outline-none"
            type="number"
            min="1"
            :max="maxQuantity"
          />
          <button
            type="button"
            class="grid size-10 place-items-center rounded-full transition hover:bg-stone-100 active:scale-90 disabled:opacity-40"
            :disabled="quantity >= maxQuantity"
            aria-label="Augmenter"
            @click="quantity++"
          >
            <Plus class="size-4" />
          </button>
        </div>
        <span class="text-sm text-muted">max. {{ maxQuantity }}</span>
      </div>
    </FormField>

    <!-- Recap -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
    >
      <div
        v-if="quote"
        class="space-y-2 rounded-2xl border border-stone-200 bg-surface p-4 text-sm"
      >
        <div class="flex items-baseline justify-between">
          <span class="text-muted">
            {{ formatXof(quote.unit_price) }}
            <template v-if="quote.pricing_unit === 'night' || quote.pricing_unit === 'day'">
              × {{ durationLabel(quote.pricing_unit, quote.duration) }}</template
            >
            × {{ quote.quantity }}
          </span>
          <strong class="font-display text-xl">{{ formatXof(quote.total) }}</strong>
        </div>
        <p
          v-if="quote.pricing_unit === 'stay' && quote.stay_starts_on && quote.stay_ends_on"
          class="text-muted"
        >
          Forfait {{ formatStayRange(quote.stay_starts_on, quote.stay_ends_on) }} ·
          {{ durationLabel('night', daysBetween(quote.stay_starts_on, quote.stay_ends_on)) }}
        </p>
        <p v-if="quote.session_starts_at" class="text-muted first-letter:uppercase">
          {{ formatSessionDate(quote.session_starts_at) }} · {{ quote.session_minutes }} min
        </p>
        <PriceDetail
          :partner-base="quote.breakdown.partner_amount - quote.breakdown.markup_amount"
          :markup-bp="quote.breakdown.unit.markup_bp"
          :markup-amount="quote.breakdown.markup_amount"
          :service-fee="quote.breakdown.service_fee"
          :total="quote.total"
          :rental-cost="quote.service_price_total"
          :balance="quote.balance_due_on_site"
          :deductible="quote.is_deductible"
          :grand-total="quote.grand_total"
          :session="quote.pricing_unit === 'session'"
          class="border-t border-stone-200 pt-3"
        />
        <p v-if="quote.session_starts_at" class="flex gap-2 text-muted">
          <Hourglass class="mt-0.5 size-3.5 shrink-0" />
          <span>
            L'établissement confirme l'heure ou t'en propose une autre. Sans accord, on te rembourse
            en entier.
          </span>
        </p>
        <p class="flex gap-2 text-muted">
          <RotateCcw class="mt-0.5 size-3.5 shrink-0" />
          <span v-if="quote.cancellable_until">
            Annulation possible jusqu'au {{ formatEventDate(quote.cancellable_until) }}, pénalité de
            {{ formatRate(quote.cancellation_penalty_bp) }}.
          </span>
          <span v-else>Cette réservation ne pourra pas être annulée.</span>
        </p>
      </div>
    </Transition>

    <FormField label="Nom complet" for="customer_name" :error="form.fieldError('customer.name')">
      <input
        id="customer_name"
        v-model="customer.name"
        class="input"
        autocomplete="name"
        required
      />
    </FormField>
    <FormField
      label="Téléphone (WhatsApp de préférence)"
      for="customer_phone"
      :error="form.fieldError('customer.phone')"
    >
      <div class="flex gap-2">
        <select v-model="customer.country" class="input w-32 shrink-0 px-3" aria-label="Pays">
          <option v-for="country in PHONE_COUNTRIES" :key="country.code" :value="country.code">
            {{ country.dial }} · {{ country.label }}
          </option>
        </select>
        <input
          id="customer_phone"
          v-model="customer.phone"
          class="input"
          type="tel"
          inputmode="tel"
          autocomplete="tel-national"
          :placeholder="customer.country === 'CI' ? '07 07 07 07 07' : `Numéro sans ${dial}`"
          required
        />
      </div>
    </FormField>
    <FormField
      label="Email (facultatif)"
      for="customer_email"
      :error="form.fieldError('customer.email')"
    >
      <input
        id="customer_email"
        v-model="customer.email"
        class="input"
        type="email"
        autocomplete="email"
        placeholder="Pour en recevoir une copie"
      />
    </FormField>

    <PaymentMethodPicker
      v-model="paymentMethod"
      v-model:required="paymentMethodRequired"
      :error="paymentMethodError ?? form.fieldError('payment_method')"
    />

    <label class="flex cursor-pointer items-start gap-3 text-sm">
      <input
        v-model="acceptTerms"
        type="checkbox"
        class="mt-0.5 size-4.5 shrink-0 accent-brand-600"
      />
      <span>
        J'accepte les
        <RouterLink
          :to="{ name: 'legal.terms' }"
          target="_blank"
          class="font-medium text-brand-700 underline"
          >conditions générales</RouterLink
        >
        et la
        <RouterLink
          :to="{ name: 'legal.terms', hash: '#annulation' }"
          target="_blank"
          class="font-medium text-brand-700 underline"
          >politique d'annulation</RouterLink
        >.
      </span>
    </label>
    <p v-if="form.fieldError('accept_terms')" class="input-error">
      {{ form.fieldError('accept_terms') }}
    </p>

    <button
      class="btn-primary w-full py-3.5 text-base"
      type="submit"
      :disabled="form.processing.value || !quote?.is_bookable"
    >
      <span
        v-if="form.processing.value"
        class="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
      />
      {{
        form.processing.value
          ? 'Préparation du paiement…'
          : session
            ? `Demander la séance et payer ${quote ? formatXof(quote.total) : ''}`
            : `Réserver et payer ${quote ? formatXof(quote.total) : ''}`
      }}
    </button>
    <p class="flex items-center justify-center gap-1.5 text-center text-xs text-muted">
      <Lock class="size-3.5" /> Paiement sécurisé par mobile money, en FCFA.
    </p>
  </form>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  ArrowRight,
  BadgePercent,
  CalendarDays,
  ChevronDown,
  CircleCheck,
  Clapperboard,
  CreditCard,
  Handshake,
  Heart,
  MapPin,
  MessageCircle,
  Play,
  QrCode,
  Search,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-vue-next'
import { api } from '@/lib/api'
import { formatEventDate, formatShortDate } from '@/lib/format'
import { LISTING_CATEGORY_ICONS } from '@/lib/icons'
import StageBackdrop from '@/components/StageBackdrop.vue'
import EventCountdown from '@/components/EventCountdown.vue'
import SkeletonCard from '@/components/SkeletonCard.vue'
import ListingCard from '@/components/ListingCard.vue'
import {
  LISTING_CATEGORIES,
  PARTNER_TYPE_LABELS,
  type EventItem,
  type Listing,
} from '@/types/catalog'
import type { FeedVideo } from '@/types/discovery'

const events = ref<EventItem[]>([])
// Listings bookable all year, outside events ("Réserver" teaser).
const stays = ref<Listing[]>([])
// First videos of "Découvrir" (teaser).
const videos = ref<FeedVideo[]>([])
const loading = ref(true)
const failed = ref(false)

onMounted(async () => {
  api
    .get<{ data: Listing[] }>('/api/v1/public/listings', { per_page: 6 })
    .then((r) => (stays.value = r.data))
    .catch(() => {})
  api
    .get<{ data: FeedVideo[] }>('/api/v1/public/discovery/feed')
    // The feed repeats the "À la une" video: each video once here.
    .then(
      (r) =>
        (videos.value = r.data
          .filter((v, i, all) => v.cover_url && all.findIndex((w) => w.id === v.id) === i)
          .slice(0, 4)),
    )
    .catch(() => {})
  try {
    events.value = (await api.get<{ data: EventItem[] }>('/api/v1/public/events')).data
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
})

const featured = computed(() => events.value[0] ?? null)
const others = computed(() => events.value.slice(1))

const marquee = [
  'Abidjan',
  'Paris → Abidjan',
  'Assinie',
  'Bouaké',
  'Montréal → Abidjan',
  'Grand-Bassam',
  'Yamoussoukro',
  'Bruxelles → Abidjan',
  'San-Pédro',
  'Londres → Abidjan',
]

const steps = [
  {
    icon: Search,
    title: 'Choisis',
    text: 'Un concert, une nuit, une voiture, un massage : trouve ton offre dans le catalogue ou en vidéo.',
  },
  {
    icon: CreditCard,
    title: 'Paie en 2 minutes',
    text: 'Sans compte. Wave, Orange Money, MTN, Moov ou Djamo : tu choisis, tu valides.',
  },
  {
    icon: QrCode,
    title: 'Reçois ton QR code',
    text: 'Confirmation sur WhatsApp et par email. Pour une séance, l’établissement confirme ton heure.',
  },
  {
    icon: CircleCheck,
    title: 'Présente-toi sur place',
    text: 'Le partenaire scanne ton QR code. S’il reste un montant, tu le règles sur place.',
  },
]

const features = [
  {
    icon: BadgePercent,
    title: 'Prix transparents',
    text: 'Tu vois ce que tu paies maintenant et ce qu’il reste à régler sur place. Aucune surprise.',
  },
  {
    icon: Wallet,
    title: 'Wave, Orange Money, MTN, Moov',
    text: 'Paie avec ton portefeuille mobile, en FCFA, sans créer de compte.',
  },
  {
    icon: MessageCircle,
    title: 'Tout sur WhatsApp',
    text: 'Ton code, ton QR code et tes rappels arrivent directement sur ton téléphone.',
  },
  {
    icon: Clapperboard,
    title: 'Voir avant de réserver',
    text: 'Avant de réserver, regarde le lieu tel qu’il est dans Découvrir.',
  },
  {
    icon: ShieldCheck,
    title: 'Partenaires vérifiés',
    text: 'Hôtels, résidences, loueurs, spas, restaurants : chaque établissement est vérifié par l’équipe KiffUp.',
  },
  {
    icon: Heart,
    title: 'Ton compte, si tu veux',
    text: 'Garde tes favoris et retrouve toutes tes réservations avec ton numéro, sans mot de passe.',
  },
]

const faq = [
  {
    q: 'Que se passe-t-il quand je réserve ?',
    a: 'Tu paies en ligne le montant de la réservation, ou l’acompte d’une séance. Tu reçois aussitôt ton code et ton QR code sur WhatsApp et par email. Sur place, tu règles le reste au partenaire, s’il y en a.',
  },
  {
    q: 'Comment se passe une séance (massage, soin…) ?',
    a: 'Tu choisis le jour et l’heure dans les horaires de l’établissement et tu paies un acompte, toujours déduit du prix. L’établissement confirme ou te propose une autre heure ; sans accord, on te rembourse en entier. La veille et le jour même, un rappel WhatsApp te demande de confirmer ta venue.',
  },
  {
    q: 'Que veut dire « déductible » ?',
    a: 'Le montant payé en ligne est retiré du prix à payer sur place. Chaque offre indique clairement ce qu’il te restera à payer.',
  },
  {
    q: 'Dois-je créer un compte ?',
    a: 'Non. Ton nom, ton téléphone et ton email suffisent pour réserver. Le compte, ouvert avec ton numéro et un code reçu sur WhatsApp, sert à garder tes favoris et à retrouver toutes tes réservations.',
  },
  {
    q: 'Puis-je annuler ?',
    a: 'Oui, jusqu’à la date limite affichée avant le paiement et sur ton billet : en général 48 heures après ta réservation (jamais dans les 48 heures avant un événement), et jusqu’à 24 heures avant une séance. Une pénalité est retenue, le reste t’est remboursé.',
  },
  {
    q: 'C’est quoi, Découvrir ?',
    a: 'Un fil de courtes vidéos publiées par les partenaires : plages, restaurants, hôtels, spas, espaces d’événements. Fais défiler, aime, partage, écris au lieu directement sur KiffUp ou réserve l’offre liée : c’est gratuit et ouvert à tous. En haut, l’onglet Vitrine montre d’autres lieux : avec ton compte, 5 vidéos gratuites par jour, puis le Pass Vitrine pour tout voir et les contacter.',
  },
  {
    q: 'Pourquoi les prix des événements augmentent-ils ?',
    a: 'Plus l’événement approche, plus la demande est forte. Réserver tôt te garantit le meilleur prix et le plus grand choix.',
  },
]
</script>

<template>
  <div>
    <!-- ───────────── HERO ───────────── -->
    <section
      class="relative isolate overflow-hidden pt-22 pb-8 text-white sm:pt-36 sm:pb-20 lg:min-h-[92svh] lg:pb-28"
    >
      <StageBackdrop :image="featured?.cover_url" />

      <div class="container-page relative grid items-center gap-14 lg:grid-cols-[1.15fr_0.85fr]">
        <div class="space-y-5 sm:space-y-7">
          <p class="chip glass animate-fade-up text-white/90">
            <Sparkles class="size-3.5 text-gold-400" /> Sorties, séjours et bien-être
          </p>
          <h1
            class="animate-fade-up text-[2rem] leading-[1.06] font-extrabold [animation-delay:80ms] sm:text-6xl lg:text-7xl"
          >
            Concerts, nuits, massages :
            <span class="text-gradient animate-gradient"
              >tout ce que tu kiffes, réservé en 2 minutes.</span
            >
          </h1>
          <p
            class="hidden max-w-xl animate-fade-up text-lg text-white/75 [animation-delay:160ms] sm:block"
          >
            Découvre les lieux en vidéo et réserve chez des partenaires vérifiés depuis ton
            téléphone, à Abidjan comme depuis Paris.
          </p>
          <!-- Phones: the four categories as shortcuts, as in an app. -->
          <nav
            class="grid animate-fade-up grid-cols-4 gap-2 [animation-delay:160ms] sm:hidden"
            aria-label="Catégories"
          >
            <RouterLink
              v-for="category in LISTING_CATEGORIES"
              :key="category.key"
              :to="{ name: 'stays', query: { categorie: category.key } }"
              class="flex flex-col items-center gap-1.5 rounded-2xl glass px-1 py-3 text-center text-[11px] font-semibold active:scale-95"
            >
              <span class="grid size-10 place-items-center rounded-xl bg-sunset shadow-glow">
                <component :is="LISTING_CATEGORY_ICONS[category.key]" class="size-5" />
              </span>
              {{ category.label }}
            </RouterLink>
          </nav>
          <div
            class="hidden animate-fade-up grid-cols-2 gap-3 [animation-delay:240ms] sm:flex sm:flex-wrap"
          >
            <a href="#evenements" class="btn-primary col-span-2 px-7 py-3.5 text-base">
              Voir les événements <ArrowRight class="size-4" />
            </a>
            <RouterLink :to="{ name: 'stays' }" class="btn-glass px-7 py-3.5 text-base">
              Réserver
            </RouterLink>
            <RouterLink :to="{ name: 'discover' }" class="btn-glass px-7 py-3.5 text-base">
              <Play class="size-4" /> Découvrir
            </RouterLink>
          </div>
          <ul
            class="flex animate-fade-up flex-wrap gap-x-6 gap-y-2 text-xs text-white/70 [animation-delay:320ms] sm:text-sm"
          >
            <li class="inline-flex items-center gap-2">
              <Wallet class="size-4 text-brand-400" /> Wave, Orange, MTN, Moov
            </li>
            <li class="inline-flex items-center gap-2">
              <QrCode class="size-4 text-flare-400" /> QR code immédiat
            </li>
            <li class="inline-flex items-center gap-2">
              <MessageCircle class="size-4 text-dusk-500" /> Confirmé sur WhatsApp
            </li>
          </ul>
        </div>

        <!-- Product visual: floating ticket + notifications -->
        <div class="relative mx-auto hidden w-full max-w-sm lg:block">
          <div class="absolute -inset-6 rounded-[2.5rem] bg-sunset opacity-30 blur-2xl" />
          <div class="relative animate-float rounded-4xl glass p-2 shadow-2xl">
            <div class="overflow-hidden rounded-[1.6rem] bg-white text-ink">
              <div class="relative h-40 bg-sunset">
                <img
                  v-if="featured?.cover_url"
                  :src="featured.cover_url"
                  alt=""
                  class="size-full object-cover opacity-90"
                />
                <div class="absolute inset-0 bg-gradient-to-t from-night-950/80 to-transparent" />
                <div class="absolute bottom-3 left-4 right-4 text-white">
                  <p class="text-xs tracking-widest text-white/70 uppercase">
                    {{ featured?.artist ?? 'Concert' }}
                  </p>
                  <p class="font-display text-xl leading-tight font-bold">
                    {{ featured?.name ?? 'Ton prochain concert' }}
                  </p>
                </div>
              </div>
              <div
                class="flex items-center justify-between gap-3 border-b border-dashed border-stone-300 px-4 py-3 text-sm"
              >
                <span class="inline-flex items-center gap-1.5 text-muted">
                  <CalendarDays class="size-4" />
                  {{ featured ? formatShortDate(featured.starts_at) : 'Bientôt' }}
                </span>
                <span class="inline-flex items-center gap-1.5 text-muted">
                  <MapPin class="size-4" /> {{ featured?.city ?? 'Abidjan' }}
                </span>
              </div>
              <div class="flex items-center gap-4 px-4 py-4">
                <QrCode class="size-16 shrink-0 text-night-900" />
                <div>
                  <p class="text-xs text-muted">Code de réservation</p>
                  <p class="font-mono text-lg font-bold tracking-wider">KU-7KQ4-M9XP</p>
                  <p class="mt-1 chip bg-emerald-50 text-emerald-700">
                    <CircleCheck class="size-3.5" /> Confirmée
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div
            class="absolute -top-5 -left-16 flex items-center gap-3 rounded-2xl glass px-4 py-3 text-sm shadow-xl animate-float [animation-delay:-2s]"
          >
            <span class="grid size-9 place-items-center rounded-full bg-emerald-500"
              ><MessageCircle class="size-4"
            /></span>
            <span
              ><span class="block font-semibold">WhatsApp</span
              ><span class="text-white/70">Ton QR code est prêt</span></span
            >
          </div>
          <div
            class="absolute -right-10 -bottom-6 flex items-center gap-3 rounded-2xl glass px-4 py-3 text-sm shadow-xl animate-float [animation-delay:-4s]"
          >
            <span class="grid size-9 place-items-center rounded-full bg-brand-500"
              ><Wallet class="size-4"
            /></span>
            <span
              ><span class="block font-semibold">Paiement reçu</span
              ><span class="text-white/70">Wave · 53 000 FCFA</span></span
            >
          </div>
        </div>
      </div>

      <a
        href="#evenements"
        class="absolute bottom-6 left-1/2 hidden -translate-x-1/2 text-white/60 transition hover:text-white lg:block"
        aria-label="Défiler vers les événements"
      >
        <ChevronDown class="size-7 animate-bounce" />
      </a>
    </section>

    <!-- ───────────── MARQUEE ───────────── -->
    <div
      class="relative hidden overflow-hidden border-y border-white/10 bg-night-900 py-4 text-white/60 sm:block"
    >
      <div
        class="flex w-max animate-[marquee_38s_linear_infinite] gap-10 font-display text-lg font-semibold whitespace-nowrap"
      >
        <template v-for="n in 2" :key="n">
          <span
            v-for="city in marquee"
            :key="`${n}-${city}`"
            class="inline-flex items-center gap-10"
          >
            {{ city }} <Sparkles class="size-4 text-brand-500" />
          </span>
        </template>
      </div>
    </div>

    <!-- ───────────── EVENTS ───────────── -->
    <section id="evenements" class="container-page scroll-mt-20 py-8 sm:py-24">
      <div v-reveal class="mb-5 flex flex-wrap items-end justify-between gap-4 sm:mb-10">
        <div>
          <p class="text-sm font-semibold tracking-widest text-brand-600 uppercase">À l'affiche</p>
          <h2 class="mt-2 text-3xl font-extrabold sm:text-4xl">Concerts et spectacles</h2>
        </div>
        <p class="hidden max-w-md text-muted sm:block">
          Choisis ton événement et réserve ta nuit, ta voiture ou ton pack avant que les prix
          n'augmentent.
        </p>
      </div>

      <div v-if="loading" class="grid gap-6 lg:grid-cols-3">
        <div class="skeleton aspect-[16/10] rounded-4xl lg:col-span-2" />
        <SkeletonCard />
      </div>
      <p v-else-if="failed" class="alert-error">
        Impossible de charger les événements pour le moment.
      </p>
      <div
        v-else-if="events.length === 0"
        class="card flex flex-col items-center gap-3 py-16 text-center"
      >
        <CalendarDays class="size-10 text-brand-500" />
        <p class="font-display text-xl font-semibold">Les prochains événements arrivent bientôt</p>
        <p class="text-muted">
          Reviens très vite : les réservations ouvrent dès l'annonce des concerts. En attendant, tu
          peux réserver toute l'année.
        </p>
        <RouterLink :to="{ name: 'stays' }" class="btn-primary mt-2">
          Réserver <ArrowRight class="size-4" />
        </RouterLink>
      </div>

      <template v-else>
        <!-- Featured event -->
        <RouterLink
          v-if="featured"
          v-reveal
          :to="{ name: 'event', params: { slug: featured.slug } }"
          class="group relative isolate block overflow-hidden rounded-4xl bg-night-900 text-white shadow-lift"
        >
          <img
            v-if="featured.cover_url"
            :src="featured.cover_url"
            :alt="featured.name"
            class="absolute inset-0 -z-10 size-full object-cover transition duration-1000 group-hover:scale-105"
          />
          <div v-else class="absolute inset-0 -z-10 bg-sunset animate-gradient" />
          <div
            class="absolute inset-0 -z-10 bg-gradient-to-r from-night-950/95 via-night-950/70 to-night-950/10"
          />
          <div class="grid gap-8 p-7 sm:p-10 lg:grid-cols-2 lg:p-14">
            <div class="space-y-5">
              <span class="chip bg-brand-500 text-white"
                ><Sparkles class="size-3.5" /> Prochain événement</span
              >
              <div>
                <p v-if="featured.artist" class="text-sm tracking-widest text-white/70 uppercase">
                  {{ featured.artist }}
                </p>
                <h3 class="mt-1 text-3xl font-extrabold sm:text-5xl">{{ featured.name }}</h3>
              </div>
              <div class="space-y-1.5 text-white/80">
                <p class="inline-flex items-center gap-2 first-letter:uppercase">
                  <CalendarDays class="size-4" /> {{ formatEventDate(featured.starts_at) }}
                </p>
                <p class="flex items-center gap-2">
                  <MapPin class="size-4" /> {{ featured.venue }}, {{ featured.city }}
                </p>
              </div>
              <EventCountdown v-if="featured.is_bookable" :starts-at="featured.starts_at" />
              <span class="btn-light w-fit px-6 py-3">
                Voir les offres
                <ArrowRight class="size-4 transition group-hover:translate-x-1" />
              </span>
            </div>
          </div>
        </RouterLink>

        <!-- Other events -->
        <!-- Phones: a row swiped with the finger. -->
        <div
          v-if="others.length"
          class="-mx-4 mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3"
        >
          <RouterLink
            v-for="(event, i) in others"
            :key="event.id"
            v-reveal="i * 90"
            :to="{ name: 'event', params: { slug: event.slug } }"
            class="group card card-hover w-[78%] shrink-0 snap-start overflow-hidden p-0 sm:w-auto"
          >
            <div class="relative aspect-[16/10] overflow-hidden bg-sunset">
              <img
                v-if="event.cover_url"
                :src="event.cover_url"
                :alt="event.name"
                class="size-full object-cover transition duration-700 group-hover:scale-110"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-night-950/70 to-transparent" />
              <span class="chip absolute bottom-3 left-4 bg-white/90 text-ink">
                <CalendarDays class="size-3.5 text-brand-600" />
                {{ formatShortDate(event.starts_at) }}
              </span>
            </div>
            <div class="p-5">
              <h3 class="font-display text-lg font-bold group-hover:text-brand-700">
                {{ event.name }}
              </h3>
              <p class="mt-1 flex items-center gap-1.5 text-sm text-muted">
                <MapPin class="size-3.5" /> {{ event.venue }}, {{ event.city }}
              </p>
            </div>
          </RouterLink>
        </div>
      </template>
    </section>

    <!-- ───────────── DISCOVER TEASER ───────────── -->
    <section class="bg-night-950 py-8 text-white sm:py-24">
      <div class="container-page">
        <div v-reveal class="mb-5 flex flex-wrap items-end justify-between gap-4 sm:mb-10">
          <div>
            <p class="text-sm font-semibold tracking-widest text-brand-400 uppercase">Découvrir</p>
            <h2 class="mt-2 text-3xl font-extrabold sm:text-4xl">Les lieux en vidéo</h2>
            <p class="mt-3 hidden max-w-xl text-white/70 sm:block">
              Plages, restaurants, hôtels, spas, espaces d'événements : fais défiler les vidéos des
              partenaires, contacte-les en un geste ou réserve l'offre liée.
            </p>
          </div>
          <RouterLink :to="{ name: 'discover' }" class="btn-light">
            <Play class="size-4" /> Ouvrir Découvrir
          </RouterLink>
        </div>
        <div
          v-if="videos.length"
          class="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4"
        >
          <RouterLink
            v-for="(video, i) in videos"
            :key="video.id"
            v-reveal="i * 80"
            :to="{ name: 'discover-video', params: { videoId: video.id } }"
            class="group relative block aspect-[9/14] w-[42%] shrink-0 snap-start overflow-hidden rounded-3xl bg-night-800 sm:w-auto"
          >
            <img
              :src="video.cover_url!"
              :alt="video.caption ?? ''"
              class="size-full object-cover transition duration-700 group-hover:scale-105"
            />
            <div
              class="absolute inset-0 bg-gradient-to-t from-night-950/90 via-night-950/10 to-transparent"
            />
            <span
              class="absolute top-3 left-3 grid size-9 place-items-center rounded-full bg-white/20 backdrop-blur"
            >
              <Play class="size-4" />
            </span>
            <div class="absolute inset-x-3 bottom-3">
              <p class="truncate text-sm font-semibold">
                {{ video.partner?.name ?? PARTNER_TYPE_LABELS[video.category] }}
              </p>
              <p class="truncate text-xs text-white/70">
                {{ PARTNER_TYPE_LABELS[video.category] }} · {{ video.city }}
              </p>
            </div>
          </RouterLink>
        </div>
      </div>
    </section>

    <!-- ───────────── BOOK ALL YEAR ───────────── -->
    <section class="container-page py-8 sm:py-24">
      <div v-reveal class="mb-5 flex flex-wrap items-end justify-between gap-4 sm:mb-10">
        <div>
          <p class="text-sm font-semibold tracking-widest text-brand-600 uppercase">
            Toute l'année
          </p>
          <h2 class="mt-2 text-3xl font-extrabold sm:text-4xl">Réserve aux dates de ton choix</h2>
          <p class="mt-3 hidden max-w-xl text-muted sm:block">
            Avec ou sans événement : une nuit, un week-end, une voiture pour la journée ou un moment
            de détente.
          </p>
        </div>
        <RouterLink :to="{ name: 'stays' }" class="btn-secondary">
          Tout voir <ArrowRight class="size-4" />
        </RouterLink>
      </div>
      <!-- Phones: the categories are already at the top of the page. -->
      <div class="hidden grid-cols-2 gap-4 sm:grid lg:grid-cols-4">
        <RouterLink
          v-for="(category, i) in LISTING_CATEGORIES"
          :key="category.key"
          v-reveal="i * 70"
          :to="{ name: 'stays', query: { categorie: category.key } }"
          class="group card card-hover flex flex-col gap-3 p-5"
        >
          <span
            class="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600 transition duration-300 group-hover:bg-sunset group-hover:text-white"
          >
            <component :is="LISTING_CATEGORY_ICONS[category.key]" class="size-6" />
          </span>
          <span>
            <span class="block font-display text-lg font-bold">{{ category.label }}</span>
            <span class="block text-sm text-muted">{{ category.hint }}</span>
          </span>
        </RouterLink>
      </div>
      <div
        v-if="stays.length"
        class="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:mt-8 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3"
      >
        <div
          v-for="(listing, i) in stays"
          :key="listing.id"
          v-reveal="(i % 3) * 80"
          class="w-[82%] shrink-0 snap-start sm:w-auto"
        >
          <ListingCard
            :listing="listing"
            :to="{ name: 'stay', params: { listingId: listing.id } }"
          />
        </div>
      </div>
    </section>

    <!-- ───────────── HOW IT WORKS ───────────── -->
    <section
      id="comment-ca-marche"
      class="relative hidden scroll-mt-20 overflow-hidden bg-white py-20 sm:block sm:py-24"
    >
      <div
        class="pointer-events-none absolute -top-24 right-0 size-96 rounded-full bg-brand-100 blur-3xl"
      />
      <div class="container-page relative">
        <div v-reveal class="mx-auto max-w-2xl text-center">
          <p class="text-sm font-semibold tracking-widest text-brand-600 uppercase">
            Simple comme un message
          </p>
          <h2 class="mt-2 text-3xl font-extrabold sm:text-4xl">Comment ça marche ?</h2>
          <p class="mt-3 text-muted">
            De la réservation à ton arrivée, tout se passe sur ton téléphone.
          </p>
        </div>

        <ol class="relative mt-14 grid gap-6 md:grid-cols-4">
          <div
            class="absolute top-8 right-[12%] left-[12%] hidden h-px bg-gradient-to-r from-brand-300 via-flare-400 to-dusk-500 md:block"
          />
          <li
            v-for="(step, i) in steps"
            :key="step.title"
            v-reveal="i * 120"
            class="relative text-center"
          >
            <div
              class="relative mx-auto grid size-16 place-items-center rounded-2xl bg-sunset text-white shadow-glow"
            >
              <component :is="step.icon" class="size-7" />
              <span
                class="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-night-900 text-xs font-bold"
              >
                {{ i + 1 }}
              </span>
            </div>
            <h3 class="mt-5 font-display text-lg font-bold">{{ step.title }}</h3>
            <p class="mt-2 text-sm text-muted">{{ step.text }}</p>
          </li>
        </ol>
      </div>
    </section>

    <!-- ───────────── FEATURES ───────────── -->
    <section class="container-page hidden py-20 sm:block sm:py-24">
      <div v-reveal class="max-w-2xl">
        <p class="text-sm font-semibold tracking-widest text-brand-600 uppercase">
          Pourquoi KiffUp
        </p>
        <h2 class="mt-2 text-3xl font-extrabold sm:text-4xl">
          Pensé pour ceux qui sortent, d'ici ou de loin
        </h2>
      </div>
      <div class="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="(feature, i) in features"
          :key="feature.title"
          v-reveal="(i % 3) * 100"
          class="group card card-hover"
        >
          <div
            class="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600 transition duration-300 group-hover:rotate-6 group-hover:bg-sunset group-hover:text-white"
          >
            <component :is="feature.icon" class="size-6" />
          </div>
          <h3 class="mt-4 font-display text-lg font-bold">{{ feature.title }}</h3>
          <p class="mt-1.5 text-sm leading-relaxed text-muted">{{ feature.text }}</p>
        </div>
      </div>
    </section>

    <!-- ───────────── PARTNERS (addressed with "vous") ───────────── -->
    <section id="partenaires" class="container-page scroll-mt-20 pb-8 sm:pb-24">
      <!-- Phones: a short card. -->
      <RouterLink
        :to="{ name: 'become-partner' }"
        class="flex items-center gap-4 rounded-3xl bg-night-900 p-5 text-white active:scale-[0.99] sm:hidden"
      >
        <span class="grid size-12 shrink-0 place-items-center rounded-2xl bg-sunset shadow-glow">
          <Handshake class="size-6" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block font-display font-bold">Vous avez un établissement ?</span>
          <span class="block text-sm text-white/70">Devenez partenaire KiffUp</span>
        </span>
        <ArrowRight class="size-5 shrink-0" />
      </RouterLink>
      <div
        v-reveal
        class="relative isolate hidden overflow-hidden rounded-4xl bg-night-900 px-7 py-12 text-white sm:block sm:px-12 lg:px-16 lg:py-16"
      >
        <div
          class="absolute -top-24 -right-20 -z-10 size-96 rounded-full bg-brand-500/40 blur-3xl animate-blob"
        />
        <div
          class="absolute -bottom-24 -left-10 -z-10 size-96 rounded-full bg-dusk-600/40 blur-3xl animate-blob [animation-delay:-8s]"
        />
        <div class="grid items-center gap-10 lg:grid-cols-2">
          <div class="space-y-4">
            <span class="chip glass"
              ><Handshake class="size-3.5" /> Hôtels, loueurs, spas, restaurants, plages</span
            >
            <h2 class="text-3xl font-extrabold sm:text-4xl">
              Faites découvrir votre lieu, remplissez votre agenda
            </h2>
            <p class="text-white/75">
              Montrez votre établissement en vidéo à la diaspora et au public local, et recevez des
              réservations payées d'avance. Vous fixez votre prix, vous le recevez en totalité.
            </p>
          </div>
          <ul class="space-y-3">
            <li class="rounded-2xl glass px-5 py-4">
              <p class="flex items-center gap-2 font-display font-bold">
                <Clapperboard class="size-5 text-brand-400" /> Vitrine
              </p>
              <p class="mt-1 text-sm text-white/75">
                Vos vidéos dans Vitrine, l'espace de Découvrir réservé aux clients connectés, qui
                vous contactent sur WhatsApp, par appel ou avec l'itinéraire.
              </p>
            </li>
            <li class="rounded-2xl glass px-5 py-4">
              <p class="flex items-center gap-2 font-display font-bold">
                <CircleCheck class="size-5 text-emerald-400" /> Réservable
              </p>
              <p class="mt-1 text-sm text-white/75">
                En plus : vos chambres, véhicules ou séances payés en ligne, une alerte WhatsApp à
                chaque réservation, les arrivées validées par QR code et vos retraits sur Wave,
                Orange Money ou par virement.
              </p>
            </li>
            <li class="pt-2">
              <RouterLink :to="{ name: 'become-partner' }" class="btn-light px-6 py-3"
                >Devenir partenaire <ArrowRight class="size-4"
              /></RouterLink>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- ───────────── FAQ ───────────── -->
    <section id="faq" class="scroll-mt-20 bg-white py-10 sm:py-24">
      <div class="container-page grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <div v-reveal>
          <p class="text-sm font-semibold tracking-widest text-brand-600 uppercase">
            Tes questions
          </p>
          <h2 class="mt-2 text-3xl font-extrabold sm:text-4xl">Questions fréquentes</h2>
          <p class="mt-3 text-muted">
            Une autre question ? Écris-nous sur WhatsApp, on répond vite.
          </p>
        </div>
        <div class="space-y-3">
          <details
            v-for="(item, i) in faq"
            :key="item.q"
            v-reveal="i * 60"
            class="group rounded-3xl border border-stone-200 bg-surface px-6 py-5 open:border-brand-200 open:bg-white open:shadow-card"
          >
            <summary
              class="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-semibold"
            >
              {{ item.q }}
              <ChevronDown
                class="size-5 shrink-0 text-brand-600 transition duration-300 group-open:rotate-180"
              />
            </summary>
            <p class="mt-3 leading-relaxed text-stone-600">{{ item.a }}</p>
          </details>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
@keyframes marquee {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}
</style>

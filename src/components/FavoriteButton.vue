<script setup lang="ts">
import { watch } from 'vue'
import { Heart } from 'lucide-vue-next'
import { useFavorites } from '@/composables/useFavorites'
import { useAuthStore } from '@/stores/auth'

/** Heart that saves a listing in the customer's favorites (login asked first for visitors). */
const props = defineProps<{ listingId: number; dark?: boolean }>()

const favorites = useFavorites()
const saved = favorites.isFavorite(props.listingId)
// Public pages render before the session is known: (re)load once the customer is.
const auth = useAuthStore()
watch(
  () => auth.user?.id,
  () => favorites.ensureLoaded(),
  { immediate: true },
)

function onClick(event: MouseEvent) {
  // Inside a card link: the heart must not open the listing.
  event.preventDefault()
  event.stopPropagation()
  favorites.toggle(props.listingId)
}
</script>

<template>
  <button
    type="button"
    class="grid size-10 place-items-center rounded-full shadow-sm backdrop-blur transition active:scale-90"
    :class="
      dark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white/90 text-ink hover:bg-white'
    "
    :aria-pressed="saved"
    :aria-label="saved ? 'Retirer des favoris' : 'Ajouter aux favoris'"
    :title="saved ? 'Retirer des favoris' : 'Ajouter aux favoris'"
    @click="onClick"
  >
    <Heart
      class="size-5 transition"
      :class="saved ? 'fill-rose-500 text-rose-500' : ''"
      stroke-width="2.2"
    />
  </button>
</template>

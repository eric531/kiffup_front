<script setup lang="ts">
import { computed } from 'vue'
import { useHead } from '@unhead/vue'
import { LEGAL_DOCUMENTS, LEGAL_UPDATED_ON, type LegalBlock } from '@/lib/legal'

/** Conditions générales, confidentialité, mentions légales (content in lib/legal.ts). */
const props = defineProps<{ doc: 'terms' | 'privacy' | 'notice' }>()
const document = computed(() => LEGAL_DOCUMENTS[props.doc]())
useHead({ title: computed(() => document.value.title) })

const PAGES = [
  { doc: 'terms', label: 'Conditions générales', to: { name: 'legal.terms' } },
  { doc: 'privacy', label: 'Confidentialité', to: { name: 'legal.privacy' } },
  { doc: 'notice', label: 'Mentions légales', to: { name: 'legal.notice' } },
] as const

const isList = (block: LegalBlock): block is { list: string[] } => typeof block !== 'string'
</script>

<template>
  <article class="container-page max-w-3xl pt-[calc(5.5rem+env(safe-area-inset-top))] pb-16">
    <nav class="tabs max-w-full overflow-x-auto" aria-label="Pages légales">
      <RouterLink
        v-for="page in PAGES"
        :key="page.doc"
        :to="page.to"
        class="tab shrink-0"
        :class="{ 'tab-active': page.doc === doc }"
      >
        {{ page.label }}
      </RouterLink>
    </nav>

    <header class="mt-8">
      <h1 class="text-3xl font-extrabold sm:text-4xl">{{ document.title }}</h1>
      <p class="mt-2 text-sm text-muted">Mise à jour le {{ LEGAL_UPDATED_ON }}</p>
      <p class="mt-4 text-lg text-stone-700">{{ document.intro }}</p>
    </header>

    <nav v-if="document.sections.length > 4" class="card mt-8 p-5" aria-label="Sommaire">
      <p class="text-sm font-semibold text-stone-700">Sommaire</p>
      <ol class="mt-2 grid gap-1.5 text-sm sm:grid-cols-2">
        <li v-for="section in document.sections" :key="section.id">
          <a :href="`#${section.id}`" class="text-brand-700 hover:underline">{{ section.title }}</a>
        </li>
      </ol>
    </nav>

    <section
      v-for="section in document.sections"
      :id="section.id"
      :key="section.id"
      class="mt-10 scroll-mt-24"
    >
      <h2 class="text-xl font-bold">{{ section.title }}</h2>
      <template v-for="(block, i) in section.blocks" :key="i">
        <ul
          v-if="isList(block)"
          class="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-stone-700"
        >
          <li v-for="item in block.list" :key="item">{{ item }}</li>
        </ul>
        <p v-else class="mt-3 leading-relaxed text-stone-700">{{ block }}</p>
      </template>
    </section>

    <p class="mt-12 text-sm text-muted">
      Voir aussi :
      <template v-for="(page, i) in PAGES.filter((p) => p.doc !== doc)" :key="page.doc">
        <RouterLink :to="page.to" class="font-medium text-brand-700 hover:underline">{{
          page.label
        }}</RouterLink
        ><template v-if="i === 0"> · </template>
      </template>
    </p>
  </article>
</template>

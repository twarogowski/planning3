<script setup lang="ts">
import { ref } from 'vue'
import { onClickOutside, onKeyStroke } from '@vueuse/core'
import { Keyboard } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

const open = ref(false)
const root = ref<HTMLDivElement | null>(null)
onClickOutside(root, () => (open.value = false))
onKeyStroke('Escape', () => (open.value = false))

const groups: { title: string; items: { keys: string[]; label: string }[] }[] = [
  {
    title: 'Mapa',
    items: [
      { keys: ['↑', '↓', '←', '→'], label: 'Przesuwanie mapy' },
      { keys: ['+', '−'], label: 'Powiększenie / pomniejszenie' },
      { keys: ['Q', 'E'], label: 'Obrót w lewo / prawo' },
      { keys: ['R'], label: 'Reset obrotu (północ do góry)' },
    ],
  },
  {
    title: 'Sterowanie gestami',
    items: [
      { keys: ['G'], label: 'Włącz / wyłącz sterowanie gestami' },
      { keys: ['Shift', 'G'], label: 'Pokaż / ukryj podgląd kamery' },
    ],
  },
  {
    title: 'Aplikacja',
    items: [
      { keys: ['D'], label: 'Motyw jasny / ciemny' },
      { keys: ['Ctrl', 'E'], label: 'Reset localStorage (z potwierdzeniem)' },
    ],
  },
]
</script>

<template>
  <div ref="root" class="relative">
    <Button
      variant="outline"
      size="icon"
      :aria-pressed="open"
      :title="open ? 'Zamknij pomoc' : 'Skróty klawiaturowe'"
      class="shadow-md"
      @click="open = !open"
    >
      <Keyboard />
    </Button>

    <Transition
      enter-active-class="transition duration-150 ease-out"
      leave-active-class="transition duration-100 ease-in"
      enter-from-class="opacity-0 -translate-x-1 scale-95"
      leave-to-class="opacity-0 -translate-x-1 scale-95"
    >
      <div
        v-if="open"
        role="dialog"
        aria-label="Skróty klawiaturowe"
        class="absolute right-full top-0 z-50 mr-2 w-[20rem] rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-lg"
      >
        <div class="mb-1 flex items-center gap-2 text-sm font-semibold">
          <Keyboard class="size-4" />
          Skróty klawiaturowe
        </div>

        <div v-for="g in groups" :key="g.title" class="mt-2">
          <div class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {{ g.title }}
          </div>
          <ul class="grid gap-1">
            <li v-for="s in g.items" :key="s.label" class="flex items-center gap-2 text-xs">
              <span class="flex flex-shrink-0 gap-1">
                <kbd
                  v-for="(k, i) in s.keys"
                  :key="i"
                  class="inline-flex min-w-[1.5rem] items-center justify-center rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold"
                >{{ k }}</kbd>
              </span>
              <span class="text-muted-foreground">{{ s.label }}</span>
            </li>
          </ul>
        </div>

        <p class="mt-3 text-[10px] text-muted-foreground">
          Skróty mapy (strzałki, +/−, Q E R) działają, gdy mapa ma fokus.
          Reszta jest globalna i pomija pola formularzy.
        </p>
      </div>
    </Transition>
  </div>
</template>

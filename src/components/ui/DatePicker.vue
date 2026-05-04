<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

const props = defineProps<{
  modelValue: string // ISO yyyy-mm-dd
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const MONTHS = [
  'styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec',
  'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień',
]
const MONTHS_SHORT = [
  'sty', 'lut', 'mar', 'kwi', 'maj', 'cze',
  'lip', 'sie', 'wrz', 'paź', 'lis', 'gru',
]
const DAY_HEADERS = ['pn', 'wt', 'śr', 'cz', 'pt', 'sb', 'nd']
const DOW_SHORT = ['nd', 'pn', 'wt', 'śr', 'cz', 'pt', 'sb']

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y!, (m ?? 1) - 1, d ?? 1)
}
function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const open = ref(false)
const root = ref<HTMLDivElement | null>(null)
onClickOutside(root, () => (open.value = false))

const view = ref(parseISO(props.modelValue || toISO(new Date())))
watch(
  () => props.modelValue,
  (v) => {
    if (!v) return
    const d = parseISO(v)
    if (
      d.getFullYear() !== view.value.getFullYear() ||
      d.getMonth() !== view.value.getMonth()
    ) {
      view.value = new Date(d.getFullYear(), d.getMonth(), 1)
    }
  },
)

const todayISO = computed(() => toISO(new Date()))

const cells = computed(() => {
  const y = view.value.getFullYear()
  const m = view.value.getMonth()
  const first = new Date(y, m, 1)
  // weekday w PL: pn=0..nd=6
  const startDow = (first.getDay() + 6) % 7
  const start = new Date(y, m, 1 - startDow)
  const out: Array<{ iso: string; day: number; inMonth: boolean; isToday: boolean; isSelected: boolean }> = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const iso = toISO(d)
    out.push({
      iso,
      day: d.getDate(),
      inMonth: d.getMonth() === m,
      isToday: iso === todayISO.value,
      isSelected: iso === props.modelValue,
    })
  }
  return out
})

const monthLabel = computed(() => `${MONTHS[view.value.getMonth()]} ${view.value.getFullYear()}`)

const triggerLabel = computed(() => {
  if (!props.modelValue) return 'wybierz datę'
  const d = parseISO(props.modelValue)
  return `${DOW_SHORT[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
})

function shiftMonth(delta: number) {
  view.value = new Date(view.value.getFullYear(), view.value.getMonth() + delta, 1)
}
function shiftYear(delta: number) {
  view.value = new Date(view.value.getFullYear() + delta, view.value.getMonth(), 1)
}
function pick(iso: string) {
  emit('update:modelValue', iso)
  open.value = false
}
function pickToday() {
  const t = new Date()
  view.value = new Date(t.getFullYear(), t.getMonth(), 1)
  emit('update:modelValue', toISO(t))
  open.value = false
}
</script>

<template>
  <div ref="root" class="relative">
    <button
      type="button"
      :class="cn(
        'flex w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-left text-sm shadow-sm transition-colors',
        'hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring',
      )"
      @click="open = !open"
    >
      <CalendarIcon class="size-4 shrink-0 text-muted-foreground" />
      <span class="flex-1 truncate">{{ triggerLabel }}</span>
    </button>

    <Transition
      enter-active-class="transition duration-100 ease-out"
      leave-active-class="transition duration-75 ease-in"
      enter-from-class="opacity-0 scale-95"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="open"
        class="absolute left-0 top-full z-50 mt-1 w-[18rem] rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-lg"
        role="dialog"
        aria-label="Wybór daty"
      >
        <div class="mb-2 flex items-center justify-between gap-1">
          <button
            type="button"
            class="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            aria-label="Poprzedni rok"
            @click="shiftYear(-1)"
          >
            <ChevronLeft class="size-4" />
            <ChevronLeft class="-ml-3 size-4" />
          </button>
          <button
            type="button"
            class="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            aria-label="Poprzedni miesiąc"
            @click="shiftMonth(-1)"
          >
            <ChevronLeft class="size-4" />
          </button>
          <span class="flex-1 text-center text-sm font-medium capitalize">{{ monthLabel }}</span>
          <button
            type="button"
            class="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            aria-label="Następny miesiąc"
            @click="shiftMonth(1)"
          >
            <ChevronRight class="size-4" />
          </button>
          <button
            type="button"
            class="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            aria-label="Następny rok"
            @click="shiftYear(1)"
          >
            <ChevronRight class="size-4" />
            <ChevronRight class="-ml-3 size-4" />
          </button>
        </div>

        <div class="grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium uppercase text-muted-foreground">
          <span v-for="dh in DAY_HEADERS" :key="dh" class="py-1">{{ dh }}</span>
        </div>

        <div class="grid grid-cols-7 gap-0.5">
          <button
            v-for="cell in cells"
            :key="cell.iso"
            type="button"
            :class="cn(
              'aspect-square rounded-md text-xs font-medium transition-colors',
              !cell.inMonth && 'text-muted-foreground/40',
              cell.inMonth && 'hover:bg-accent',
              cell.isToday && !cell.isSelected && 'border border-primary/40 text-primary',
              cell.isSelected && 'bg-primary text-primary-foreground hover:bg-primary',
            )"
            @click="pick(cell.iso)"
          >
            {{ cell.day }}
          </button>
        </div>

        <div class="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2 text-xs">
          <button
            type="button"
            class="rounded-md px-2 py-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            @click="pickToday"
          >
            Dzisiaj
          </button>
          <button
            type="button"
            class="rounded-md px-2 py-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            @click="open = false"
          >
            Zamknij
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

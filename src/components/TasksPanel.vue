<script setup lang="ts">
import { computed, ref } from 'vue'
import { X, Package, MapPin, Clock, Weight } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { TransportTask } from '@/data/mockTasks'

const props = defineProps<{
  open: boolean
  tasks: TransportTask[]
  highlightedTaskId: string | null
}>()

const emit = defineEmits<{
  close: []
  highlight: [taskId: string | null]
}>()

const filter = ref<'all' | TransportTask['status']>('all')

const filtered = computed(() =>
  filter.value === 'all'
    ? props.tasks
    : props.tasks.filter((t) => t.status === filter.value),
)

const counts = computed(() => ({
  all: props.tasks.length,
  new: props.tasks.filter((t) => t.status === 'new').length,
  planning: props.tasks.filter((t) => t.status === 'planning').length,
  planned: props.tasks.filter((t) => t.status === 'planned').length,
}))

const STATUS_LABEL: Record<TransportTask['status'], string> = {
  new: 'Nowe',
  planning: 'W planowaniu',
  planned: 'Zaplanowane',
}

const STATUS_DOT: Record<TransportTask['status'], string> = {
  new: 'bg-sky-500',
  planning: 'bg-amber-500',
  planned: 'bg-green-500',
}
</script>

<template>
  <Transition
    enter-active-class="transition-transform duration-300 ease-out"
    leave-active-class="transition-transform duration-200 ease-in"
    enter-from-class="-translate-x-full"
    leave-to-class="-translate-x-full"
  >
    <aside
      v-if="open"
      class="absolute inset-y-0 left-0 z-20 flex h-full w-full max-w-md flex-col border-r border-border bg-background/95 shadow-2xl backdrop-blur"
    >
      <header class="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <h2 class="text-base font-semibold leading-tight">Zlecenia do zaplanowania</h2>
          <p class="text-xs text-muted-foreground">{{ counts.all }} zleceń w kolejce</p>
        </div>
        <Button variant="ghost" size="icon" aria-label="Zamknij panel" @click="emit('close')">
          <X />
        </Button>
      </header>

      <div class="flex flex-wrap gap-1 border-b border-border px-3 py-2">
        <Button
          v-for="opt in (['all', 'new', 'planning', 'planned'] as const)"
          :key="opt"
          :variant="filter === opt ? 'default' : 'outline'"
          size="sm"
          @click="filter = opt"
        >
          <span v-if="opt !== 'all'" :class="cn('mr-1 inline-block h-2 w-2 rounded-full', STATUS_DOT[opt])" />
          {{ opt === 'all' ? 'Wszystkie' : STATUS_LABEL[opt] }}
          <span class="ml-1 text-xs opacity-70">{{ counts[opt] }}</span>
        </Button>
      </div>

      <div class="flex-1 overflow-y-auto">
        <ul class="divide-y divide-border">
          <li
            v-for="task in filtered"
            :key="task.id"
            :class="cn(
              'cursor-pointer px-4 py-3 transition-colors hover:bg-accent/60',
              highlightedTaskId === task.id && 'bg-accent'
            )"
            @mouseenter="emit('highlight', task.id)"
            @mouseleave="emit('highlight', null)"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium">{{ task.reference }}</p>
                <p class="truncate text-xs text-muted-foreground">{{ task.customer }}</p>
              </div>
              <span
                :class="cn(
                  'inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
                )"
              >
                <span :class="cn('inline-block h-1.5 w-1.5 rounded-full', STATUS_DOT[task.status])" />
                {{ STATUS_LABEL[task.status] }}
              </span>
            </div>

            <div class="mt-2 grid gap-1 text-xs text-muted-foreground">
              <div class="flex items-center gap-2">
                <MapPin class="size-3.5 shrink-0 text-sky-500" />
                <span class="truncate">{{ task.origin.name }} → {{ task.destination.name }}</span>
              </div>
              <div class="flex items-center gap-2">
                <Clock class="size-3.5 shrink-0" />
                <span>{{ task.pickupAt }} — {{ task.deliveryAt }}</span>
              </div>
              <div class="flex items-center gap-4">
                <span class="flex items-center gap-1">
                  <Package class="size-3.5" />
                  {{ task.cargo }}
                </span>
                <span class="flex items-center gap-1">
                  <Weight class="size-3.5" />
                  {{ (task.weightKg / 1000).toFixed(1) }} t
                </span>
              </div>
            </div>
          </li>

          <li v-if="filtered.length === 0" class="px-4 py-8 text-center text-sm text-muted-foreground">
            Brak zleceń w tej kategorii.
          </li>
        </ul>
      </div>

      <footer class="border-t border-border px-4 py-3 text-xs text-muted-foreground">
        Najedź kursorem na zlecenie, aby podświetlić trasę na mapie.
      </footer>
    </aside>
  </Transition>
</template>

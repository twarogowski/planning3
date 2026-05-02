<script setup lang="ts">
import { ref, computed } from 'vue'
import { ListChecks, Keyboard } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import MapView from '@/components/Map.vue'
import TasksPanel from '@/components/TasksPanel.vue'
import { mockTasks } from '@/data/mockTasks'

const panelOpen = ref(false)
const helpOpen = ref(false)
const highlightedTaskId = ref<string | null>(null)

const tasks = ref(mockTasks)
const pendingCount = computed(() => tasks.value.filter((t) => t.status !== 'planned').length)

const shortcuts: { keys: string[]; label: string }[] = [
  { keys: ['↑', '↓', '←', '→'], label: 'Przesuwanie mapy' },
  { keys: ['+', '−'], label: 'Powiększenie / pomniejszenie' },
  { keys: ['Q', 'E'], label: 'Obrót w lewo / prawo' },
  { keys: ['R'], label: 'Reset obrotu (północ do góry)' },
]
</script>

<template>
  <div class="relative h-screen w-screen overflow-hidden">
    <MapView :tasks="tasks" :highlighted-task-id="highlightedTaskId" />

    <TasksPanel
      :open="panelOpen"
      :tasks="tasks"
      :highlighted-task-id="highlightedTaskId"
      @close="panelOpen = false"
      @highlight="(id) => (highlightedTaskId = id)"
    />

    <div class="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-4">
      <div class="pointer-events-auto rounded-md border border-border bg-background/90 px-3 py-2 text-sm shadow-md backdrop-blur">
        <span class="font-semibold">Planning3</span>
        <span class="ml-2 text-muted-foreground">— planowanie zleceń transportowych</span>
      </div>

      <div class="pointer-events-auto">
        <Button
          v-if="!panelOpen"
          size="lg"
          class="shadow-lg"
          @click="panelOpen = true"
        >
          <ListChecks />
          Zlecenia do zaplanowania
          <span class="ml-1 rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs">
            {{ pendingCount }}
          </span>
        </Button>
      </div>
    </div>

    <div class="pointer-events-none absolute bottom-4 right-4 z-10">
      <div class="pointer-events-auto rounded-md border border-border bg-background/90 px-3 py-2 text-xs shadow-md backdrop-blur">
        <div class="font-medium">Status zleceń</div>
        <div class="mt-1 flex items-center gap-3">
          <span class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded-full bg-sky-500" /> Nowe</span>
          <span class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded-full bg-amber-500" /> W planowaniu</span>
          <span class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded-full bg-green-500" /> Zaplanowane</span>
        </div>
      </div>
    </div>

    <div class="pointer-events-none absolute bottom-4 left-4 z-10">
      <div class="pointer-events-auto overflow-hidden rounded-md border border-border bg-background/90 text-xs shadow-md backdrop-blur">
        <button
          type="button"
          class="flex w-full items-center gap-2 px-3 py-2 text-left font-medium hover:bg-accent/60"
          @click="helpOpen = !helpOpen"
        >
          <Keyboard class="size-3.5" />
          Skróty klawiaturowe
          <span class="ml-auto text-muted-foreground">{{ helpOpen ? '−' : '+' }}</span>
        </button>
        <div v-if="helpOpen" class="border-t border-border px-3 py-2">
          <ul class="grid gap-1.5">
            <li v-for="s in shortcuts" :key="s.label" class="flex items-center gap-2">
              <span class="flex gap-1">
                <kbd
                  v-for="k in s.keys"
                  :key="k"
                  class="inline-flex min-w-[1.5rem] items-center justify-center rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold"
                >{{ k }}</kbd>
              </span>
              <span class="text-muted-foreground">{{ s.label }}</span>
            </li>
          </ul>
          <p class="mt-2 text-[10px] text-muted-foreground">
            Skróty działają, gdy mapa ma fokus (kliknij w mapę, jeśli przestaną reagować).
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

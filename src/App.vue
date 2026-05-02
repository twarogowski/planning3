<script setup lang="ts">
import { ref, computed } from 'vue'
import { ListChecks } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import MapView from '@/components/Map.vue'
import TasksPanel from '@/components/TasksPanel.vue'
import { mockTasks } from '@/data/mockTasks'

const panelOpen = ref(false)
const highlightedTaskId = ref<string | null>(null)

const tasks = ref(mockTasks)
const pendingCount = computed(() => tasks.value.filter((t) => t.status !== 'planned').length)
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
  </div>
</template>

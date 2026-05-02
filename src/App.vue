<script setup lang="ts">
import { ref, computed } from 'vue'
import { ListChecks } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import MapView from '@/components/Map.vue'
import TasksPanel from '@/components/TasksPanel.vue'
import GestureCamera from '@/components/GestureCamera.vue'
import { mockTasks } from '@/data/mockTasks'

const panelOpen = ref(false)
const highlightedTaskId = ref<string | null>(null)

const tasks = ref(mockTasks)
const pendingCount = computed(() => tasks.value.filter((t) => t.status !== 'planned').length)

const mapRef = ref<InstanceType<typeof MapView> | null>(null)

function onGesturePan(dx: number, dy: number) {
  mapRef.value?.panByPixels(dx, dy)
}
function onGestureZoom(factor: number) {
  mapRef.value?.zoomByFactor(factor)
}
function onGestureRotate(delta: number) {
  mapRef.value?.rotateByRadians(delta)
}
</script>

<template>
  <div class="relative h-screen w-screen overflow-hidden">
    <MapView
      ref="mapRef"
      :tasks="tasks"
      :highlighted-task-id="highlightedTaskId"
    />

    <TasksPanel
      :open="panelOpen"
      :tasks="tasks"
      :highlighted-task-id="highlightedTaskId"
      @close="panelOpen = false"
      @highlight="(id) => (highlightedTaskId = id)"
    />

    <div class="pointer-events-none absolute left-4 top-4 z-10">
      <div class="pointer-events-auto rounded-md border border-border bg-background/90 px-3 py-2 text-sm shadow-md backdrop-blur">
        <span class="font-semibold">Planning3</span>
        <span class="ml-2 text-muted-foreground">— planowanie zleceń transportowych</span>
      </div>
    </div>

    <div class="pointer-events-none absolute right-4 top-4 z-10 flex flex-col items-end gap-3">
      <div class="pointer-events-auto">
        <Button v-if="!panelOpen" size="lg" class="shadow-lg" @click="panelOpen = true">
          <ListChecks />
          Zlecenia do zaplanowania
          <span class="ml-1 rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs">
            {{ pendingCount }}
          </span>
        </Button>
      </div>

      <div class="pointer-events-auto">
        <GestureCamera
          @pan="onGesturePan"
          @zoom="onGestureZoom"
          @rotate="onGestureRotate"
        />
      </div>
    </div>
  </div>
</template>

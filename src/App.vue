<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { ListChecks, Sun, Moon } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import MapView from '@/components/Map.vue'
import PlannerPanel from '@/components/PlannerPanel.vue'
import GestureCamera from '@/components/GestureCamera.vue'
import { useTheme } from '@/composables/useTheme'
import { usePlanner } from '@/composables/usePlanner'

const planner = usePlanner()

const panelOpen = ref(true)
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

const { theme, toggle: toggleTheme } = useTheme()

const cardLabel = computed(() => {
  switch (planner.state.view) {
    case 'setup':
      return `Planowanie · ${planner.ordersForSelected.value.length} zleceń`
    case 'running':
      return `Solver · ${Math.round(planner.currentRun.value?.progressPct ?? 0)}%`
    case 'solutions':
      return `Rozwiązania · ${planner.state.solutions.length}`
    case 'solution-detail':
      return `Rozwiązanie · ${planner.selectedSolution.value?.routes.length ?? 0} tras`
  }
  return 'Planer'
})

function handleGlobalKey(e: KeyboardEvent) {
  if (e.key !== 'd' && e.key !== 'D') return
  const t = e.target as HTMLElement | null
  if (
    t &&
    (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
  ) {
    return
  }
  e.preventDefault()
  toggleTheme()
}

onMounted(() => window.addEventListener('keydown', handleGlobalKey))
onBeforeUnmount(() => window.removeEventListener('keydown', handleGlobalKey))
</script>

<template>
  <div class="relative h-screen w-screen overflow-hidden">
    <MapView ref="mapRef" :theme="theme" />

    <PlannerPanel :open="panelOpen" @close="panelOpen = false" />

    <div class="pointer-events-none absolute right-4 top-4 z-10 flex items-start gap-2">
      <div class="pointer-events-auto">
        <Button
          variant="outline"
          size="icon"
          :title="`Motyw (D) — aktualnie ${theme === 'dark' ? 'ciemny' : 'jasny'}`"
          class="shadow-md"
          @click="toggleTheme"
        >
          <Moon v-if="theme === 'light'" />
          <Sun v-else />
        </Button>
      </div>

      <div class="pointer-events-auto">
        <GestureCamera
          @pan="onGesturePan"
          @zoom="onGestureZoom"
          @rotate="onGestureRotate"
        />
      </div>

      <div class="pointer-events-auto">
        <Button v-if="!panelOpen" size="lg" class="shadow-lg" @click="panelOpen = true">
          <ListChecks />
          {{ cardLabel }}
        </Button>
      </div>
    </div>
  </div>
</template>

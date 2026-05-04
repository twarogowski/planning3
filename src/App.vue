<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { ListChecks, Settings2, Sun, Moon } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import MapView from '@/components/Map.vue'
import PlannerPanel from '@/components/PlannerPanel.vue'
import PresetsPanel from '@/components/PresetsPanel.vue'
import GestureCamera from '@/components/GestureCamera.vue'
import HelpPopover from '@/components/HelpPopover.vue'
import { cn } from '@/lib/utils'
import { useTheme } from '@/composables/useTheme'
import { usePlanner } from '@/composables/usePlanner'

const planner = usePlanner()

type ActivePanel = 'planner' | 'presets' | null
const activePanel = ref<ActivePanel>('planner')
const mapRef = ref<InstanceType<typeof MapView> | null>(null)

function togglePanel(name: Exclude<ActivePanel, null>) {
  activePanel.value = activePanel.value === name ? null : name
}

// Hover-zone w prawym górnym rogu — kontrolki domyślnie ukryte, fade-in 0.3 s przy najechaniu.
const controlsHovered = ref(false)

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
  const t = e.target as HTMLElement | null
  const inEditable =
    !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)

  // Ctrl+E (lub Cmd+E) — reset localStorage
  if ((e.ctrlKey || e.metaKey) && (e.key === 'e' || e.key === 'E')) {
    if (inEditable) return
    e.preventDefault()
    if (confirm('Wyczyścić localStorage i przeładować stronę? Wszystkie zapisane rozwiązania znikną.')) {
      try {
        localStorage.clear()
      } catch {
        /* ignore */
      }
      location.reload()
    }
    return
  }

  // D — przełącznik motywu
  if (e.key === 'd' || e.key === 'D') {
    if (inEditable) return
    e.preventDefault()
    toggleTheme()
  }
}

onMounted(() => window.addEventListener('keydown', handleGlobalKey))
onBeforeUnmount(() => window.removeEventListener('keydown', handleGlobalKey))
</script>

<template>
  <div class="relative h-screen w-screen overflow-hidden">
    <MapView ref="mapRef" :theme="theme" />

    <PlannerPanel :open="activePanel === 'planner'" @close="activePanel = null" />
    <PresetsPanel :open="activePanel === 'presets'" @close="activePanel = null" />

    <!-- Hover-zone: pełen obszar dla łapania kursora; kontrolki widoczne tylko przy hoverze. -->
    <div
      class="absolute right-0 top-0 z-10 p-3"
      @mouseenter="controlsHovered = true"
      @mouseleave="controlsHovered = false"
    >
      <div
        :class="cn(
          'flex flex-col items-end gap-2 transition-opacity duration-300',
          controlsHovered ? 'opacity-100' : 'pointer-events-none opacity-0',
        )"
      >
        <Button
          :variant="activePanel === 'planner' ? 'default' : 'outline'"
          size="icon"
          class="relative shadow-lg"
          :title="`Planer tras — ${cardLabel}`"
          @click="togglePanel('planner')"
        >
          <ListChecks />
          <span
            v-if="planner.state.solutions.length > 0 || planner.ordersForSelected.value.length > 0"
            class="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary-foreground px-1 text-[9px] font-bold text-primary"
          >
            {{ planner.state.solutions.length || planner.ordersForSelected.value.length }}
          </span>
        </Button>

        <Button
          :variant="activePanel === 'presets' ? 'default' : 'outline'"
          size="icon"
          class="shadow-md"
          title="Edytor presetów floty"
          @click="togglePanel('presets')"
        >
          <Settings2 />
        </Button>

        <GestureCamera
          @pan="onGesturePan"
          @zoom="onGestureZoom"
          @rotate="onGestureRotate"
        />

        <HelpPopover />

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
    </div>
  </div>
</template>

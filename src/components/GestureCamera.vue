<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed } from 'vue'
import { Hand, Loader2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useGestureControl } from '@/composables/useGestureControl'

const emit = defineEmits<{
  pan: [dx: number, dy: number]
  zoom: [factor: number]
  rotate: [delta: number]
}>()

const {
  isActive,
  isLoading,
  error,
  mode,
  videoRef,
  canvasRef,
  start,
  stop,
} = useGestureControl({
  onPan: (dx, dy) => emit('pan', dx, dy),
  onZoom: (factor) => emit('zoom', factor),
  onRotate: (delta) => emit('rotate', delta),
})

function toggle() {
  if (isActive.value) stop()
  else void start()
}

function handleGlobalKey(e: KeyboardEvent) {
  if (e.key !== 'g' && e.key !== 'G') return
  const t = e.target as HTMLElement | null
  if (
    t &&
    (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
  ) {
    return
  }
  e.preventDefault()
  toggle()
}

const title = computed(() => {
  if (isLoading.value) return 'Sterowanie gestami — ładowanie modelu…'
  return `Sterowanie gestami (G) — ${isActive.value ? 'włączone, tryb: ' + mode.value : 'wyłączone'}`
})

onMounted(() => window.addEventListener('keydown', handleGlobalKey))
onBeforeUnmount(() => window.removeEventListener('keydown', handleGlobalKey))
</script>

<template>
  <div class="relative">
    <video
      ref="videoRef"
      muted
      playsinline
      class="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0"
    />
    <canvas
      ref="canvasRef"
      class="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0"
    />

    <Button
      :variant="isActive ? 'default' : 'outline'"
      size="icon"
      :disabled="isLoading"
      :aria-pressed="isActive"
      :title="title"
      class="shadow-md"
      @click="toggle"
    >
      <Loader2 v-if="isLoading" class="animate-spin" />
      <Hand v-else :class="isActive ? 'animate-pulse' : ''" />
    </Button>

    <div
      v-if="error"
      role="alert"
      class="absolute right-0 top-full mt-1 w-[240px] rounded-md border border-border bg-background/95 px-2 py-1 text-[10px] text-destructive shadow-md backdrop-blur"
    >
      {{ error }}
    </div>
  </div>
</template>

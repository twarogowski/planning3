<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed, ref } from 'vue'
import { Hand, Loader2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useGestureControl, type GestureMode } from '@/composables/useGestureControl'

const emit = defineEmits<{
  pan: [dx: number, dy: number]
  zoom: [factor: number]
  rotate: [delta: number]
}>()

const previewVisible = ref(false)

const {
  isActive,
  isLoading,
  error,
  mode,
  detectedGesture,
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
  if (e.shiftKey) {
    previewVisible.value = !previewVisible.value
  } else {
    toggle()
  }
}

const MODE_LABEL: Record<GestureMode, string> = {
  idle: 'bezczynne',
  pan: 'pan + obrót',
  zoom: 'zoom',
}

const MODE_DOT: Record<GestureMode, string> = {
  idle: 'bg-slate-400',
  pan: 'bg-sky-500',
  zoom: 'bg-amber-500',
}

const title = computed(() => {
  if (isLoading.value) return 'Sterowanie gestami — ładowanie modelu…'
  const state = isActive.value ? `włączone (${MODE_LABEL[mode.value]})` : 'wyłączone'
  return `Sterowanie gestami — ${state}\nG: włącz/wyłącz · Shift+G: pokaż/ukryj podgląd`
})

onMounted(() => window.addEventListener('keydown', handleGlobalKey))
onBeforeUnmount(() => window.removeEventListener('keydown', handleGlobalKey))
</script>

<template>
  <div class="relative">
    <!-- Video + canvas. Gdy preview ukryty, kontener jest poza viewportem (ale w pełnym rozmiarze, żeby
         przeglądarka nie ograniczała dekodowania klatek). -->
    <div
      :class="[
        previewVisible
          ? 'absolute right-0 top-full mt-2 h-[180px] w-[240px] overflow-hidden rounded-md border border-border bg-slate-900 shadow-lg'
          : 'pointer-events-none fixed -left-[9999px] top-0 h-[240px] w-[320px]',
      ]"
    >
      <video
        ref="videoRef"
        muted
        playsinline
        class="absolute inset-0 h-full w-full object-cover"
        style="transform: scaleX(-1)"
      />
      <canvas ref="canvasRef" class="absolute inset-0 h-full w-full" />

      <template v-if="previewVisible">
        <div
          v-if="!isActive && !isLoading"
          class="absolute inset-0 flex flex-col items-center justify-center gap-1 text-xs text-white/80"
        >
          <Hand class="size-6 opacity-70" />
          <span>Kamera wyłączona — naciśnij G</span>
        </div>
        <div
          v-if="isLoading"
          class="absolute inset-0 flex items-center justify-center gap-2 text-xs text-white"
        >
          <Loader2 class="size-4 animate-spin" />
          <span>Ładowanie modelu…</span>
        </div>
        <div
          v-if="isActive"
          class="absolute left-1 top-1 flex items-center gap-1 rounded bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white"
        >
          <span :class="['inline-block h-1.5 w-1.5 rounded-full', MODE_DOT[mode]]" />
          {{ MODE_LABEL[mode] }}
        </div>
        <div
          v-if="isActive"
          class="absolute right-1 top-1 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white"
        >
          {{ detectedGesture }}
        </div>
      </template>
    </div>

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

<script setup lang="ts">
import { Camera, CameraOff, Loader2, Hand } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useGestureControl, type GestureMode } from '@/composables/useGestureControl'

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

const MODE_LABEL: Record<GestureMode, string> = {
  idle: 'Bezczynne',
  pan: 'Przesuwanie',
  transform: 'Zoom + obrót',
}

const MODE_DOT: Record<GestureMode, string> = {
  idle: 'bg-slate-400',
  pan: 'bg-sky-500',
  transform: 'bg-amber-500',
}

function toggle() {
  if (isActive.value) stop()
  else void start()
}
</script>

<template>
  <div class="w-[260px] overflow-hidden rounded-md border border-border bg-background/90 shadow-lg backdrop-blur">
    <div class="relative aspect-[4/3] w-full bg-slate-900">
      <video
        ref="videoRef"
        class="absolute inset-0 h-full w-full object-cover"
        style="transform: scaleX(-1)"
        muted
        playsinline
      />
      <canvas ref="canvasRef" class="absolute inset-0 h-full w-full" />

      <div
        v-if="!isActive && !isLoading"
        class="absolute inset-0 flex flex-col items-center justify-center gap-1 text-xs text-white/80"
      >
        <Hand class="size-6 opacity-70" />
        <span>Kamera wyłączona</span>
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
    </div>

    <div class="flex items-center justify-between gap-2 px-2 py-2">
      <span class="text-xs font-medium">Sterowanie gestami</span>
      <Button :variant="isActive ? 'destructive' : 'default'" size="sm" :disabled="isLoading" @click="toggle">
        <component :is="isActive ? CameraOff : Camera" />
        {{ isActive ? 'Wyłącz' : 'Włącz' }}
      </Button>
    </div>

    <div v-if="error" class="border-t border-border px-2 py-1 text-[10px] text-destructive">
      {{ error }}
    </div>

    <details class="border-t border-border text-[10px]">
      <summary class="cursor-pointer px-2 py-1.5 font-medium hover:bg-accent/60">
        Jak sterować gestami
      </summary>
      <ul class="space-y-1 px-2 pb-2 text-muted-foreground">
        <li><span class="font-semibold text-foreground">Pięść (1 ręka)</span> — przesuwanie mapy</li>
        <li><span class="font-semibold text-foreground">2 ręce</span> — odsuwaj/przybliżaj dłonie, by zoomować, obracaj wzajemnie, by obrócić mapę</li>
        <li><span class="font-semibold text-foreground">Otwarta dłoń</span> — pauza (release)</li>
      </ul>
    </details>
  </div>
</template>

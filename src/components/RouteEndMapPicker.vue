<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import Map from 'ol/Map'
import View from 'ol/View'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import { fromLonLat, toLonLat } from 'ol/proj'
import { Style, Stroke, Circle as CircleStyle, Fill } from 'ol/style'
import { defaults as defaultControls } from 'ol/control'
import { apply } from 'ol-mapbox-style'
import { Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/composables/useTheme'

const props = defineProps<{
  modelValue: [number, number] | null // [lon, lat]
  centerLonLat?: [number, number]
}>()
const emit = defineEmits<{ 'update:modelValue': [value: [number, number] | null] }>()

const { theme } = useTheme()
const mapEl = ref<HTMLDivElement | null>(null)
let map: Map | null = null
let markerSource: VectorSource | null = null

const STYLE_FOR_THEME = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
}

function pinStyle() {
  return new Style({
    image: new CircleStyle({
      radius: 8,
      fill: new Fill({ color: '#ef4444' }),
      stroke: new Stroke({ color: '#ffffff', width: 2 }),
    }),
  })
}

function drawMarker() {
  if (!markerSource) return
  markerSource.clear()
  if (!props.modelValue) return
  const [lon, lat] = props.modelValue
  const f = new Feature({ geometry: new Point(fromLonLat([lon, lat])) })
  f.setStyle(pinStyle())
  markerSource.addFeature(f)
}

function applyStyle() {
  if (!map) return
  // Wyczyść poprzednie warstwy bazowe
  const layers = map.getLayers().getArray().slice()
  for (const l of layers) {
    if (l !== markerLayer) map.removeLayer(l)
  }
  apply(map, STYLE_FOR_THEME[theme.value], {
    getFonts: (fonts: string[]) => fonts,
  } as Parameters<typeof apply>[2])
    .then(() => {
      // upewnij się, że marker jest na wierzchu
      if (markerLayer && map) {
        if (map.getLayers().getArray().includes(markerLayer)) map.removeLayer(markerLayer)
        map.addLayer(markerLayer)
      }
    })
    .catch((err) => console.error('apply style failed', err))
}

let markerLayer: VectorLayer | null = null

onMounted(() => {
  if (!mapEl.value) return
  markerSource = new VectorSource()
  markerLayer = new VectorLayer({ source: markerSource })

  const center: [number, number] =
    props.modelValue ?? props.centerLonLat ?? [19.45, 52.0]

  map = new Map({
    target: mapEl.value,
    controls: defaultControls({ attribution: false, zoom: true, rotate: false }),
    view: new View({
      center: fromLonLat(center),
      zoom: 9,
      minZoom: 4,
      maxZoom: 17,
    }),
  })

  applyStyle()
  // dodaj warstwę markera (apply dorzuci ją na koniec, bringToTop w callbacku)
  if (map && markerLayer) map.addLayer(markerLayer)
  drawMarker()

  map.on('click', (evt) => {
    if (!map) return
    const [lon, lat] = toLonLat(evt.coordinate)
    emit('update:modelValue', [+lon.toFixed(5), +lat.toFixed(5)])
  })
})

watch(() => props.modelValue, () => drawMarker())
watch(() => theme.value, () => applyStyle())

onBeforeUnmount(() => {
  map?.setTarget(undefined)
  map = null
  markerSource = null
  markerLayer = null
})

function clear() {
  emit('update:modelValue', null)
}
</script>

<template>
  <div>
    <div
      ref="mapEl"
      class="relative h-[260px] w-full overflow-hidden rounded-md border border-border bg-muted"
      role="application"
      aria-label="Mapa wyboru końcowego punktu trasy. Kliknij, aby ustawić punkt."
    />
    <div class="mt-1 flex items-center justify-between text-[11px]">
      <span v-if="modelValue" class="font-mono text-muted-foreground">
        {{ modelValue[1].toFixed(5) }}, {{ modelValue[0].toFixed(5) }}
      </span>
      <span v-else class="italic text-muted-foreground">
        Kliknij na mapie, aby wybrać punkt końcowy
      </span>
      <Button v-if="modelValue" variant="ghost" size="sm" class="h-6 px-2 text-[11px]" @click="clear">
        <Trash2 class="size-3" />
        Wyczyść
      </Button>
    </div>
  </div>
</template>

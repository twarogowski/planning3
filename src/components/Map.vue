<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import Map from 'ol/Map'
import View from 'ol/View'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import LineString from 'ol/geom/LineString'
import { fromLonLat } from 'ol/proj'
import { Style, Stroke, Circle as CircleStyle, Fill, Text } from 'ol/style'
import { defaults as defaultControls, ScaleLine } from 'ol/control'
import { apply } from 'ol-mapbox-style'
import type { TransportTask } from '@/data/mockTasks'

const VECTOR_STYLE_URL = 'https://tiles.openfreemap.org/styles/dark'

const props = defineProps<{
  tasks: TransportTask[]
  highlightedTaskId?: string | null
}>()

const mapEl = ref<HTMLDivElement | null>(null)
let map: Map | null = null
let routesSource: VectorSource | null = null
let pointsSource: VectorSource | null = null

const STATUS_COLORS: Record<TransportTask['status'], string> = {
  new: '#0ea5e9',
  planning: '#f59e0b',
  planned: '#22c55e',
}

function buildFeatures(tasks: TransportTask[], highlightId?: string | null) {
  if (!routesSource || !pointsSource) return
  routesSource.clear()
  pointsSource.clear()

  for (const task of tasks) {
    const color = STATUS_COLORS[task.status]
    const isHighlighted = highlightId === task.id

    const from = fromLonLat(task.origin.lonLat)
    const to = fromLonLat(task.destination.lonLat)

    const line = new Feature({ geometry: new LineString([from, to]), task })
    line.setStyle(
      new Style({
        stroke: new Stroke({
          color,
          width: isHighlighted ? 5 : 2.5,
          lineDash: task.status === 'planned' ? undefined : [8, 6],
        }),
      }),
    )
    routesSource.addFeature(line)

    const origin = new Feature({ geometry: new Point(from), task, role: 'origin' })
    origin.setStyle(
      new Style({
        image: new CircleStyle({
          radius: isHighlighted ? 8 : 6,
          fill: new Fill({ color }),
          stroke: new Stroke({ color: '#ffffff', width: 2 }),
        }),
        text: new Text({
          text: task.origin.name.split(',')[0],
          offsetY: -14,
          font: '12px ui-sans-serif, system-ui, sans-serif',
          fill: new Fill({ color: '#f8fafc' }),
          stroke: new Stroke({ color: '#0f172a', width: 3 }),
        }),
      }),
    )
    pointsSource.addFeature(origin)

    const destination = new Feature({ geometry: new Point(to), task, role: 'destination' })
    destination.setStyle(
      new Style({
        image: new CircleStyle({
          radius: isHighlighted ? 8 : 6,
          fill: new Fill({ color: '#ffffff' }),
          stroke: new Stroke({ color, width: 3 }),
        }),
        text: new Text({
          text: task.destination.name.split(',')[0],
          offsetY: -14,
          font: '12px ui-sans-serif, system-ui, sans-serif',
          fill: new Fill({ color: '#f8fafc' }),
          stroke: new Stroke({ color: '#0f172a', width: 3 }),
        }),
      }),
    )
    pointsSource.addFeature(destination)
  }
}

function handleKey(e: KeyboardEvent) {
  if (!map) return
  const view = map.getView()
  const step = Math.PI / 12 // 15°

  if (e.key === 'q' || e.key === 'Q') {
    view.animate({ rotation: view.getRotation() - step, duration: 150 })
    e.preventDefault()
  } else if (e.key === 'e' || e.key === 'E') {
    view.animate({ rotation: view.getRotation() + step, duration: 150 })
    e.preventDefault()
  } else if (e.key === 'r' || e.key === 'R') {
    view.animate({ rotation: 0, duration: 250 })
    e.preventDefault()
  }
}

onMounted(() => {
  if (!mapEl.value) return

  routesSource = new VectorSource()
  pointsSource = new VectorSource()

  map = new Map({
    target: mapEl.value,
    controls: defaultControls({ attribution: true, zoom: true }).extend([
      new ScaleLine({ units: 'metric' }),
    ]),
    view: new View({
      center: fromLonLat([19.45, 52.0]),
      zoom: 6.4,
      minZoom: 3,
      maxZoom: 18,
      enableRotation: true,
    }),
  })

  const overlayLayers = [
    new VectorLayer({ source: routesSource }),
    new VectorLayer({ source: pointsSource }),
  ]

  apply(map, VECTOR_STYLE_URL)
    .then(() => {
      for (const layer of overlayLayers) map?.addLayer(layer)
    })
    .catch((err) => {
      console.error('Nie udało się załadować stylu wektorowego', err)
      for (const layer of overlayLayers) map?.addLayer(layer)
    })

  mapEl.value.addEventListener('keydown', handleKey)
  mapEl.value.focus({ preventScroll: true })

  buildFeatures(props.tasks, props.highlightedTaskId)
})

watch(
  () => [props.tasks, props.highlightedTaskId] as const,
  ([tasks, highlight]) => buildFeatures(tasks, highlight),
  { deep: true },
)

onBeforeUnmount(() => {
  mapEl.value?.removeEventListener('keydown', handleKey)
  map?.setTarget(undefined)
  map = null
})

function panByPixels(dxPx: number, dyPx: number) {
  if (!map) return
  const view = map.getView()
  const res = view.getResolution()
  if (res === undefined) return
  view.adjustCenter([-dxPx * res, dyPx * res])
}

function zoomByFactor(factor: number) {
  if (!map || !Number.isFinite(factor) || factor <= 0) return
  map.getView().adjustResolution(1 / factor)
}

function rotateByRadians(delta: number) {
  if (!map || !Number.isFinite(delta)) return
  map.getView().adjustRotation(delta)
}

function resetRotation() {
  if (!map) return
  map.getView().animate({ rotation: 0, duration: 250 })
}

defineExpose({ panByPixels, zoomByFactor, rotateByRadians, resetRotation })
</script>

<template>
  <div
    ref="mapEl"
    tabindex="0"
    aria-label="Mapa zleceń transportowych. Strzałki przesuwają, plus i minus zoomują, Q i E obracają, R resetuje obrót."
    class="absolute inset-0 h-full w-full outline-none focus:outline-none"
  />
</template>

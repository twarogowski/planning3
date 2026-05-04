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
import { Style, Stroke, Circle as CircleStyle, Fill, Text, RegularShape } from 'ol/style'
import { defaults as defaultControls, ScaleLine } from 'ol/control'
import { apply } from 'ol-mapbox-style'
import type BaseLayer from 'ol/layer/Base'
import { hubs, hubById } from '@/data/hubs'
import type { Hub, RoutePlan } from '@/types/domain'
import { usePlanner } from '@/composables/usePlanner'

const STYLE_FOR_THEME = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
}

const props = withDefaults(
  defineProps<{
    theme?: 'light' | 'dark'
  }>(),
  { theme: 'dark' },
)

const planner = usePlanner()

const mapEl = ref<HTMLDivElement | null>(null)
let map: Map | null = null
let hubsSource: VectorSource | null = null
let routesSource: VectorSource | null = null
let stopsSource: VectorSource | null = null
let highlightSource: VectorSource | null = null
let hubsLayer: VectorLayer | null = null
let routesLayer: VectorLayer | null = null
let stopsLayer: VectorLayer | null = null
let highlightLayer: VectorLayer | null = null
let basemapLayers: BaseLayer[] = []

// Paleta dla tras — tyle kolorów żeby ~25 różnych kierowców było rozróżnialnych.
const ROUTE_COLORS = [
  '#0ea5e9', '#f59e0b', '#22c55e', '#ef4444', '#a855f7',
  '#ec4899', '#14b8a6', '#f97316', '#84cc16', '#6366f1',
  '#06b6d4', '#eab308', '#10b981', '#dc2626', '#8b5cf6',
  '#d946ef', '#0d9488', '#ea580c', '#65a30d', '#4f46e5',
  '#0891b2', '#ca8a04', '#059669', '#b91c1c', '#7c3aed',
]

function colorForRoute(routeId: string): string {
  let h = 0
  for (let i = 0; i < routeId.length; i++) h = (h * 31 + routeId.charCodeAt(i)) | 0
  return ROUTE_COLORS[Math.abs(h) % ROUTE_COLORS.length]!
}

function isDark() {
  return props.theme === 'dark'
}

function rebuildHubMarkers() {
  if (!hubsSource) return
  hubsSource.clear()
  const labelFill = isDark() ? '#f8fafc' : '#0f172a'
  const labelHalo = isDark() ? '#0f172a' : '#ffffff'
  const selected = new Set(planner.state.selectedHubIds)

  for (const h of hubs) {
    const isSelected = selected.has(h.id)
    const f = new Feature({ geometry: new Point(fromLonLat(h.lonLat)), hub: h })
    f.setStyle(
      new Style({
        image: new RegularShape({
          points: 4,
          radius: isSelected ? 10 : 7,
          angle: Math.PI / 4,
          fill: new Fill({ color: isSelected ? '#0ea5e9' : '#475569' }),
          stroke: new Stroke({ color: labelHalo, width: 2 }),
        }),
        text: new Text({
          text: h.symbol,
          offsetY: -18,
          font: 'bold 11px ui-sans-serif, system-ui, sans-serif',
          fill: new Fill({ color: labelFill }),
          stroke: new Stroke({ color: labelHalo, width: 3 }),
        }),
      }),
    )
    hubsSource.addFeature(f)
  }
}

function rebuildRoutesAndStops() {
  if (!routesSource || !stopsSource) return
  routesSource.clear()
  stopsSource.clear()

  const sol = planner.selectedSolution.value
  if (!sol) return

  const labelFill = isDark() ? '#f8fafc' : '#0f172a'
  const labelHalo = isDark() ? '#0f172a' : '#ffffff'
  const selectedRouteId = planner.selectedRouteId.value

  for (const r of sol.routes) {
    const color = colorForRoute(r.id)
    const isHighlighted = !selectedRouteId || selectedRouteId === r.id
    const opacityMul = selectedRouteId && selectedRouteId !== r.id ? 0.25 : 1

    // build path: hub -> stop1 -> stop2 -> ... -> hub
    const hub = hubById.get(r.hubId)
    if (!hub) continue
    const coords: number[][] = [fromLonLat(hub.lonLat)]
    for (const stop of r.stops) {
      const order = planner.allOrders.find((o) => o.id === stop.orderId)
      if (order) coords.push(fromLonLat(order.lonLat))
    }
    coords.push(fromLonLat(hub.lonLat)) // powrót

    const line = new Feature({
      geometry: new LineString(coords),
      route: r,
    })
    line.setStyle(
      new Style({
        stroke: new Stroke({
          color: hexToRgba(color, opacityMul),
          width: isHighlighted ? (selectedRouteId === r.id ? 4 : 2.5) : 1.5,
        }),
      }),
    )
    routesSource.addFeature(line)

    // stopy
    for (const stop of r.stops) {
      const order = planner.allOrders.find((o) => o.id === stop.orderId)
      if (!order) continue
      const f = new Feature({ geometry: new Point(fromLonLat(order.lonLat)), stop, route: r })
      f.setStyle(
        new Style({
          image: new CircleStyle({
            radius: selectedRouteId === r.id ? 6 : 4,
            fill: new Fill({ color: hexToRgba(color, opacityMul) }),
            stroke: new Stroke({ color: labelHalo, width: 1.5 }),
          }),
          text:
            selectedRouteId === r.id
              ? new Text({
                  text: String(stop.position + 1),
                  font: 'bold 10px ui-sans-serif, system-ui, sans-serif',
                  fill: new Fill({ color: labelFill }),
                  stroke: new Stroke({ color: labelHalo, width: 2 }),
                  offsetY: -12,
                })
              : undefined,
        }),
      )
      stopsSource.addFeature(f)
    }
  }
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function bringOverlaysToTop() {
  if (!map) return
  const all = map.getLayers().getArray()
  for (const l of [routesLayer, hubsLayer, stopsLayer, highlightLayer]) {
    if (l && all.includes(l)) map.removeLayer(l)
  }
  if (routesLayer) map.addLayer(routesLayer)
  if (hubsLayer) map.addLayer(hubsLayer)
  if (stopsLayer) map.addLayer(stopsLayer)
  if (highlightLayer) map.addLayer(highlightLayer)
}

function rebuildHighlight() {
  if (!highlightSource) return
  highlightSource.clear()
  const orderId = planner.highlightedOrderId.value
  if (!orderId) return
  const order = planner.allOrders.find((o) => o.id === orderId)
  if (!order) return
  const f = new Feature({ geometry: new Point(fromLonLat(order.lonLat)) })
  f.setStyle(
    new Style({
      image: new CircleStyle({
        radius: 11,
        fill: new Fill({ color: 'rgba(14, 165, 233, 0.25)' }),
        stroke: new Stroke({ color: '#0ea5e9', width: 2.5 }),
      }),
    }),
  )
  highlightSource.addFeature(f)
}

function applyMapStyle(styleUrl: string) {
  if (!map) return
  for (const l of basemapLayers) map.removeLayer(l)
  basemapLayers = []

  const before = new Set(map.getLayers().getArray())
  apply(map, styleUrl, {
    getFonts: (fonts: string[]) => fonts,
  } as Parameters<typeof apply>[2])
    .then(() => {
      if (!map) return
      basemapLayers = map.getLayers().getArray().filter((l) => !before.has(l))
      bringOverlaysToTop()
    })
    .catch((err) => {
      console.error('Nie udało się załadować stylu wektorowego', err)
      bringOverlaysToTop()
    })
}

function handleKey(e: KeyboardEvent) {
  if (!map) return
  const view = map.getView()
  const step = Math.PI / 12

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

  hubsSource = new VectorSource()
  routesSource = new VectorSource()
  stopsSource = new VectorSource()
  highlightSource = new VectorSource()
  hubsLayer = new VectorLayer({ source: hubsSource })
  routesLayer = new VectorLayer({ source: routesSource })
  stopsLayer = new VectorLayer({ source: stopsSource })
  highlightLayer = new VectorLayer({ source: highlightSource })

  map = new Map({
    target: mapEl.value,
    // Wyłączamy wszystkie natywne kontrolki (Zoom, Attribution, Rotate-kompas).
    // Reset rotacji jest na klawiszu R; atrybucję OpenFreeMap/OpenMapTiles
    // trzymamy w README aplikacji. Zostaje tylko ScaleLine na dole.
    controls: defaultControls({ attribution: false, zoom: false, rotate: false }).extend([
      new ScaleLine({ units: 'metric' }),
    ]),
    view: new View({
      center: fromLonLat([19.45, 52.0]),
      zoom: 6.2,
      minZoom: 3,
      maxZoom: 18,
      enableRotation: true,
    }),
  })

  applyMapStyle(STYLE_FOR_THEME[props.theme])

  // klik na trasie / stopie → wybierz trasę
  map.on('click', (evt) => {
    if (!map) return
    map.forEachFeatureAtPixel(evt.pixel, (feature) => {
      const route = feature.get('route') as RoutePlan | undefined
      if (route) {
        planner.selectRoute(route.id)
        return true
      }
      const hub = feature.get('hub') as Hub | undefined
      if (hub && planner.state.view === 'setup') {
        planner.toggleHub(hub.id)
        return true
      }
      return false
    })
  })

  // pointermove → highlight + cursor
  map.on('pointermove', (evt) => {
    if (!map || evt.dragging) return
    let foundOrderId: number | null = null
    let cursor = ''
    map.forEachFeatureAtPixel(evt.pixel, (f) => {
      const stop = f.get('stop') as { orderId: number } | undefined
      if (stop) {
        foundOrderId = stop.orderId
        cursor = 'pointer'
        return true
      }
      if (f.get('route') || f.get('hub')) {
        cursor = 'pointer'
        return true
      }
      return false
    })
    planner.setHighlightedOrder(foundOrderId)
    if (mapEl.value) mapEl.value.style.cursor = cursor
  })

  mapEl.value.addEventListener('keydown', handleKey)
  mapEl.value.focus({ preventScroll: true })

  rebuildHubMarkers()
  rebuildRoutesAndStops()
  rebuildHighlight()
})

watch(
  () => planner.highlightedOrderId.value,
  () => rebuildHighlight(),
)

watch(
  () => [planner.state.selectedHubIds, planner.state.view] as const,
  () => rebuildHubMarkers(),
  { deep: true },
)

watch(
  () => [planner.selectedSolution.value, planner.selectedRouteId.value] as const,
  () => rebuildRoutesAndStops(),
  { deep: true },
)

watch(
  () => props.theme,
  (next) => {
    applyMapStyle(STYLE_FOR_THEME[next])
    rebuildHubMarkers()
    rebuildRoutesAndStops()
    rebuildHighlight()
  },
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

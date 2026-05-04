import { computed, reactive, ref, watch } from 'vue'
import type {
  DeliveryOrder,
  OptimizationRun,
  Solution,
  Vehicle,
} from '@/types/domain'
import { hubs, hubById } from '@/data/hubs'
import { generateAllOrders, generateAllVehicles } from '@/data/generators'
import { runOptimization } from '@/services/optimizer'

const STORAGE_KEY = 'planning3-planner-state'

export type PlannerView = 'setup' | 'running' | 'solutions' | 'solution-detail'

interface PersistedState {
  selectedHubIds: number[]
  selectedDate: string
  description: string
  view: PlannerView
  solutions: Solution[]
  selectedSolutionId: string | null
}

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function loadPersisted(): Partial<PersistedState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function savePersisted(state: PersistedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

// Singleton — fixtures generujemy raz, store dzielimy między komponentami.
const ALL_ORDERS: DeliveryOrder[] = generateAllOrders()
const ALL_VEHICLES: Vehicle[] = generateAllVehicles()

const persisted = loadPersisted()

const state = reactive({
  selectedHubIds: persisted.selectedHubIds ?? [hubs[0]!.id, hubs[1]!.id, hubs[3]!.id],
  selectedDate: persisted.selectedDate ?? todayISO(),
  description: persisted.description ?? '',
  view: (persisted.view ?? 'setup') as PlannerView,
  solutions: (persisted.solutions ?? []) as Solution[],
  selectedSolutionId: persisted.selectedSolutionId ?? null,
})

// `currentRun`, wybór trasy i hover po zleceniu nie są w localStorage — to ulotny stan UI.
const currentRun = ref<OptimizationRun | null>(null)
const selectedRouteId = ref<string | null>(null)
const highlightedOrderId = ref<number | null>(null)
let cancelHandle: { cancel: () => void } | null = null

watch(
  () => ({
    selectedHubIds: state.selectedHubIds,
    selectedDate: state.selectedDate,
    description: state.description,
    view: state.view,
    solutions: state.solutions,
    selectedSolutionId: state.selectedSolutionId,
  }),
  (v) => savePersisted(v as PersistedState),
  { deep: true },
)

const ordersForSelected = computed(() =>
  ALL_ORDERS.filter((o) => state.selectedHubIds.includes(o.hubId)),
)
const vehiclesForSelected = computed(() =>
  ALL_VEHICLES.filter((v) => state.selectedHubIds.includes(v.hubId)),
)

const selectedSolution = computed(() =>
  state.solutions.find((s) => s.id === state.selectedSolutionId) ?? null,
)
const selectedRoute = computed(() => {
  const sol = selectedSolution.value
  if (!sol || !selectedRouteId.value) return null
  return sol.routes.find((r) => r.id === selectedRouteId.value) ?? null
})

const summaryByHub = computed(() =>
  hubs.map((h) => ({
    hub: h,
    orderCount: ALL_ORDERS.filter((o) => o.hubId === h.id).length,
    vehicleCount: h.vehicleCount,
    selected: state.selectedHubIds.includes(h.id),
  })),
)

function toggleHub(id: number) {
  const i = state.selectedHubIds.indexOf(id)
  if (i >= 0) state.selectedHubIds.splice(i, 1)
  else state.selectedHubIds.push(id)
}

function selectAllHubs() {
  state.selectedHubIds = hubs.map((h) => h.id)
}
function clearHubs() {
  state.selectedHubIds = []
}

function startOptimization() {
  if (state.selectedHubIds.length === 0) return
  if (ordersForSelected.value.length === 0) return
  state.view = 'running'
  cancelHandle = runOptimization(
    {
      hubIds: [...state.selectedHubIds],
      date: state.selectedDate,
      description: state.description.trim(),
      orders: ALL_ORDERS,
      vehicles: ALL_VEHICLES,
    },
    (run) => {
      currentRun.value = { ...run }
    },
    (run, solution) => {
      cancelHandle = null
      currentRun.value = { ...run }
      if (run.status === 'success' && solution) {
        // Najnowsze rozwiązanie na górze listy.
        state.solutions = [solution, ...state.solutions]
        state.view = 'solutions'
      } else {
        state.view = 'setup'
      }
    },
  )
}

function cancelOptimization() {
  cancelHandle?.cancel()
}

function approveSolution(id: string) {
  const s = state.solutions.find((x) => x.id === id)
  if (s) s.status = 'approved'
}

function archiveSolution(id: string) {
  state.solutions = state.solutions.filter((s) => s.id !== id)
  if (state.selectedSolutionId === id) {
    state.selectedSolutionId = null
    state.view = 'solutions'
  }
}

function openSolution(id: string) {
  state.selectedSolutionId = id
  selectedRouteId.value = null
  state.view = 'solution-detail'
}

function backToSolutions() {
  state.selectedSolutionId = null
  selectedRouteId.value = null
  state.view = 'solutions'
}

function backToSetup() {
  state.view = 'setup'
}

function goSolutions() {
  state.view = 'solutions'
}

function selectRoute(id: string | null) {
  selectedRouteId.value = id
}

function setHighlightedOrder(id: number | null) {
  if (highlightedOrderId.value !== id) highlightedOrderId.value = id
}

export function usePlanner() {
  return {
    // raw state
    state,
    // computed
    ordersForSelected,
    vehiclesForSelected,
    summaryByHub,
    selectedSolution,
    selectedRoute,
    currentRun,
    selectedRouteId,
    highlightedOrderId,
    // actions
    toggleHub,
    selectAllHubs,
    clearHubs,
    startOptimization,
    cancelOptimization,
    approveSolution,
    archiveSolution,
    openSolution,
    backToSolutions,
    backToSetup,
    goSolutions,
    selectRoute,
    setHighlightedOrder,
    // refs
    allOrders: ALL_ORDERS,
    allVehicles: ALL_VEHICLES,
    hubById,
  }
}

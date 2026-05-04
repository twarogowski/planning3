import type {
  DeliveryOrder,
  Hub,
  OptimizationRun,
  RoutePlan,
  Solution,
  Stop,
  Vehicle,
} from '@/types/domain'
import { hubById } from '@/data/hubs'

const COST_PER_KM_PLN = 4.5
const COST_BASE_PER_ROUTE_PLN = 250
const AVG_SPEED_KMH = 45
const STOP_BASE_SERVICE_MIN = 15 // rozładunek
const ORDERS_PER_ROUTE_TARGET = 17

const DRIVERS = [
  'Marek Kowalski', 'Tomasz Nowak', 'Krzysztof Wiśniewski', 'Andrzej Wójcik',
  'Piotr Kamiński', 'Jan Lewandowski', 'Adam Zieliński', 'Łukasz Szymański',
  'Michał Woźniak', 'Paweł Dąbrowski', 'Robert Kozłowski', 'Jakub Jankowski',
  'Wojciech Mazur', 'Dariusz Kwiatkowski', 'Sebastian Krawczyk',
]
const HELPERS = [
  'Bartosz Kaczmarek', 'Mateusz Piotrowski', 'Damian Grabowski',
  'Filip Nowicki', 'Kacper Adamczyk', 'Dawid Pawlak',
]

// Haversine — odległość po wielkim kole, km.
function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371
  const toRad = (x: number) => (x * Math.PI) / 180
  const dLat = toRad(b[1] - a[1])
  const dLon = toRad(b[0] - a[0])
  const lat1 = toRad(a[1])
  const lat2 = toRad(b[1])
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function minutesToHHMM(totalMin: number): string {
  const h = Math.floor(totalMin / 60)
  const m = Math.round(totalMin % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function parseHHMM(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function nearestNeighborOrder(
  start: [number, number],
  pool: DeliveryOrder[],
): DeliveryOrder[] {
  const remaining = [...pool]
  const result: DeliveryOrder[] = []
  let cursor = start
  while (remaining.length) {
    let bestIdx = 0
    let bestDist = haversineKm(cursor, remaining[0]!.lonLat)
    for (let i = 1; i < remaining.length; i++) {
      const d = haversineKm(cursor, remaining[i]!.lonLat)
      if (d < bestDist) {
        bestDist = d
        bestIdx = i
      }
    }
    const next = remaining.splice(bestIdx, 1)[0]!
    result.push(next)
    cursor = next.lonLat
  }
  return result
}

function buildRoute(
  hub: Hub,
  vehicle: Vehicle,
  orders: DeliveryOrder[],
  driverIdx: number,
  helperIdx: number,
  twoMan: boolean,
): RoutePlan {
  const sequenced = nearestNeighborOrder(hub.lonLat, orders)
  let cursor: [number, number] = hub.lonLat
  let cumulativeMin = parseHHMM('08:00')
  let cumulativeKm = 0
  const stops: Stop[] = []
  let totalWeightKg = 0
  let totalVolumeM3 = 0

  for (let i = 0; i < sequenced.length; i++) {
    const order = sequenced[i]!
    const distKm = haversineKm(cursor, order.lonLat)
    const driveMin = (distKm / AVG_SPEED_KMH) * 60
    cumulativeMin += driveMin
    const arrive = cumulativeMin

    const servicesMin = order.services.reduce((s, x) => s + x.durationMin, 0)
    const stopMin = STOP_BASE_SERVICE_MIN + servicesMin

    cumulativeMin += stopMin
    cumulativeKm += distKm
    totalWeightKg += order.weightKg
    totalVolumeM3 += order.volumeM3

    stops.push({
      orderId: order.id,
      position: i,
      arriveAt: minutesToHHMM(arrive),
      departAt: minutesToHHMM(cumulativeMin),
      serviceTimeMin: stopMin,
      distanceFromPrevKm: +distKm.toFixed(2),
      drivingFromPrevMin: Math.round(driveMin),
    })

    cursor = order.lonLat
  }

  // Powrót do huba
  const returnKm = haversineKm(cursor, hub.lonLat)
  const returnMin = (returnKm / AVG_SPEED_KMH) * 60
  cumulativeKm += returnKm
  cumulativeMin += returnMin

  const totalDurationMin = cumulativeMin - parseHHMM('08:00')
  const totalCostPLN =
    Math.round((cumulativeKm * COST_PER_KM_PLN + COST_BASE_PER_ROUTE_PLN) * 100) / 100

  return {
    id: `route-${hub.id}-${vehicle.id}`,
    hubId: hub.id,
    vehicleId: vehicle.id,
    driverName: DRIVERS[driverIdx % DRIVERS.length]!,
    helperName: twoMan ? HELPERS[helperIdx % HELPERS.length]! : undefined,
    startAt: '08:00',
    endAt: minutesToHHMM(cumulativeMin),
    totalDistanceKm: +cumulativeKm.toFixed(1),
    totalDurationMin: Math.round(totalDurationMin),
    totalCostPLN,
    totalWeightKg: +totalWeightKg.toFixed(1),
    totalVolumeM3: +totalVolumeM3.toFixed(2),
    stops,
  }
}

function packOrdersIntoRoutes(
  hub: Hub,
  hubVehicles: Vehicle[],
  hubOrders: DeliveryOrder[],
): RoutePlan[] {
  if (hubOrders.length === 0 || hubVehicles.length === 0) return []
  // Cel: ~17 stopów na trasie. Dla 50 zleceń → 3 trasy × ~17, dla 20 → 1 trasa.
  const desired = Math.max(1, Math.round(hubOrders.length / ORDERS_PER_ROUTE_TARGET))
  const routesCount = Math.min(desired, hubVehicles.length)

  // Sortuj zlecenia po dystansie od huba — daleko leżące na początek (zwykle dłuższe trasy).
  const sorted = [...hubOrders].sort(
    (a, b) => haversineKm(hub.lonLat, b.lonLat) - haversineKm(hub.lonLat, a.lonLat),
  )

  const buckets: DeliveryOrder[][] = Array.from({ length: routesCount }, () => [])
  for (let i = 0; i < sorted.length; i++) {
    buckets[i % routesCount]!.push(sorted[i]!)
  }

  return buckets.map((bucket, i) => {
    const vehicle = hubVehicles[i]!
    const twoMan = bucket.some((o) => o.weightKg > 80) // ciężkie meble = ekipa 2-osobowa
    return buildRoute(hub, vehicle, bucket, i, i, twoMan)
  })
}

export interface OptimizeArgs {
  hubIds: number[]
  date: string
  description: string
  orders: DeliveryOrder[]
  vehicles: Vehicle[]
}

export function buildSolution(run: OptimizationRun, args: OptimizeArgs): Solution {
  const ordersByHub = new Map<number, DeliveryOrder[]>()
  for (const o of args.orders) {
    if (!args.hubIds.includes(o.hubId)) continue
    if (!ordersByHub.has(o.hubId)) ordersByHub.set(o.hubId, [])
    ordersByHub.get(o.hubId)!.push(o)
  }
  const vehiclesByHub = new Map<number, Vehicle[]>()
  for (const v of args.vehicles) {
    if (!args.hubIds.includes(v.hubId)) continue
    if (!vehiclesByHub.has(v.hubId)) vehiclesByHub.set(v.hubId, [])
    vehiclesByHub.get(v.hubId)!.push(v)
  }

  const routes: RoutePlan[] = []
  let ordersPlanned = 0
  let ordersTotal = 0
  let vehiclesAvailable = 0

  for (const hubId of args.hubIds) {
    const hub = hubById.get(hubId)
    if (!hub) continue
    const hubOrders = ordersByHub.get(hubId) ?? []
    const hubVehicles = vehiclesByHub.get(hubId) ?? []
    ordersTotal += hubOrders.length
    vehiclesAvailable += hubVehicles.length
    const planned = packOrdersIntoRoutes(hub, hubVehicles, hubOrders)
    for (const r of planned) ordersPlanned += r.stops.length
    routes.push(...planned)
  }

  const totalDistanceKm = +routes.reduce((s, r) => s + r.totalDistanceKm, 0).toFixed(1)
  const totalCostPLN = +routes.reduce((s, r) => s + r.totalCostPLN, 0).toFixed(2)

  return {
    id: `sol-${run.id}`,
    runId: run.id,
    hubIds: args.hubIds,
    date: args.date,
    description: args.description,
    createdAt: new Date().toISOString(),
    status: 'pending',
    totalDistanceKm,
    totalCostPLN,
    vehiclesUsed: routes.length,
    vehiclesAvailable,
    ordersPlanned,
    ordersTotal,
    routes,
  }
}

// Mock optimizer — ~12 sek z paskiem postępu.
const MOCK_DURATION_MS = 12_000
const TICK_MS = 200

export function runOptimization(
  args: OptimizeArgs,
  onTick: (run: OptimizationRun) => void,
  onComplete: (run: OptimizationRun, solution: Solution | null) => void,
): { cancel: () => void } {
  const startedAt = new Date().toISOString()
  const run: OptimizationRun = {
    id: `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    hubIds: args.hubIds,
    date: args.date,
    description: args.description,
    status: 'running',
    progressPct: 0,
    startedAt,
  }
  onTick(run)

  const startMs = performance.now()
  let cancelled = false
  const timer = setInterval(() => {
    if (cancelled) return
    const elapsed = performance.now() - startMs
    const pct = Math.min(100, (elapsed / MOCK_DURATION_MS) * 100)
    run.progressPct = +pct.toFixed(1)
    if (pct >= 100) {
      clearInterval(timer)
      run.progressPct = 100
      run.status = 'success'
      run.finishedAt = new Date().toISOString()
      const solution = buildSolution(run, args)
      run.solutionId = solution.id
      onTick(run)
      onComplete(run, solution)
    } else {
      onTick(run)
    }
  }, TICK_MS)

  return {
    cancel() {
      if (cancelled) return
      cancelled = true
      clearInterval(timer)
      run.status = 'cancelled'
      run.finishedAt = new Date().toISOString()
      onTick(run)
      onComplete(run, null)
    },
  }
}

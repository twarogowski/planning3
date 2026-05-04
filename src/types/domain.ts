export interface Hub {
  id: number
  symbol: string
  name: string // miasto / oddział
  city: string
  lonLat: [number, number]
  size: 'S' | 'M' | 'L'
  vehicleCount: number // ile pojazdów dostępnych
}

export interface Vendor {
  id: number
  symbol: string
  displayName: string
}

export interface ServiceType {
  id: number
  name: string
  defaultDurationMin: number
}

export interface OrderService {
  serviceTypeId: number
  durationMin: number
}

export interface DeliveryOrder {
  id: number
  number: string // ZL/2026/05/01234
  vendorId: number
  hubId: number // hub destination — kto realizuje ostatnią milę
  customerName: string
  address: { street: string; city: string; postalCode: string }
  lonLat: [number, number]
  windowFrom: string // "08:00"
  windowTo: string // "20:00"
  parcelCount: number
  weightKg: number
  volumeM3: number
  isCOD: boolean
  codAmount?: number
  services: OrderService[]
  remarks?: string
}

export interface Vehicle {
  id: number
  hubId: number
  registrationNo: string // "WAW-001"
  type: 'van' | 'truck'
  capacityWeightKg: number
  capacityVolumeM3: number
}

export type OptimizationStatus = 'queued' | 'running' | 'success' | 'failed' | 'cancelled'

export interface OptimizationRun {
  id: string
  hubIds: number[]
  date: string // ISO yyyy-mm-dd
  description: string
  status: OptimizationStatus
  progressPct: number
  startedAt: string // ISO
  finishedAt?: string
  error?: string
  solutionId?: string
}

export type SolutionStatus = 'pending' | 'approved' | 'archived'

export interface Stop {
  orderId: number
  position: number // 0-indexed
  arriveAt: string // "10:23"
  departAt: string // "10:48"
  serviceTimeMin: number // unloading + dodatkowe usługi
  distanceFromPrevKm: number
  drivingFromPrevMin: number
}

export interface RoutePlan {
  id: string
  hubId: number
  vehicleId: number
  driverName: string
  helperName?: string
  startAt: string // "08:00"
  endAt: string // "16:42"
  totalDistanceKm: number
  totalDurationMin: number
  totalCostPLN: number
  totalWeightKg: number
  totalVolumeM3: number
  stops: Stop[]
}

export interface Solution {
  id: string
  runId: string
  hubIds: number[]
  date: string
  description: string
  createdAt: string
  status: SolutionStatus
  totalDistanceKm: number
  totalCostPLN: number
  vehiclesUsed: number
  vehiclesAvailable: number
  ordersPlanned: number
  ordersTotal: number
  routes: RoutePlan[]
}

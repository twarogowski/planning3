import type { DeliveryOrder, Hub, OrderService, Vehicle } from '@/types/domain'
import { hubs } from './hubs'
import { vendors } from './vendors'
import { serviceTypes } from './serviceTypes'

// Deterministyczny PRNG (mulberry32) — stabilne dane przy każdym refreshu.
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const FIRST_NAMES = [
  'Anna', 'Jan', 'Krzysztof', 'Magda', 'Piotr', 'Katarzyna', 'Tomasz',
  'Agnieszka', 'Marek', 'Joanna', 'Paweł', 'Małgorzata', 'Andrzej',
  'Ewa', 'Łukasz', 'Monika', 'Michał', 'Dorota', 'Adam', 'Beata',
]
const LAST_NAMES = [
  'Nowak', 'Kowalski', 'Wiśniewski', 'Wójcik', 'Kowalczyk',
  'Kamiński', 'Lewandowski', 'Zieliński', 'Szymański', 'Woźniak',
  'Dąbrowski', 'Kozłowski', 'Jankowski', 'Mazur', 'Wojciechowski',
  'Kwiatkowski', 'Krawczyk', 'Kaczmarek', 'Piotrowski', 'Grabowski',
]
const STREETS = [
  'ul. Słoneczna', 'ul. Polna', 'ul. Lipowa', 'ul. Ogrodowa', 'ul. Kościelna',
  'ul. Kwiatowa', 'ul. Akacjowa', 'ul. Brzozowa', 'ul. Krótka', 'ul. Długa',
  'ul. Sportowa', 'ul. Piaskowa', 'ul. Leśna', 'ul. Wiśniowa', 'ul. Klonowa',
  'ul. Sosnowa', 'ul. Krzywa', 'ul. Stara', 'ul. Nowa', 'al. Jana Pawła II',
]
// Wagi: '08:00–20:00' to dominujące okno (większość zleceń bez doprecyzowania).
const TIME_WINDOWS: { window: [string, string]; weight: number }[] = [
  { window: ['08:00', '20:00'], weight: 5 },
  { window: ['08:00', '12:00'], weight: 1 },
  { window: ['12:00', '16:00'], weight: 1 },
  { window: ['16:00', '20:00'], weight: 1 },
]

function pickWindow(rng: () => number): [string, string] {
  const total = TIME_WINDOWS.reduce((s, e) => s + e.weight, 0)
  let r = rng() * total
  for (const e of TIME_WINDOWS) {
    r -= e.weight
    if (r <= 0) return e.window
  }
  return TIME_WINDOWS[0]!.window
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]!
}

function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min
}

function randFloat(rng: () => number, min: number, max: number, digits = 2): number {
  const v = rng() * (max - min) + min
  const m = 10 ** digits
  return Math.round(v * m) / m
}

// Offset lonLat by ~kmRange km in random direction. 1° lat ≈ 111 km, 1° lon ≈ 111*cos(lat) km.
function randomNear(rng: () => number, base: [number, number], kmRange: number): [number, number] {
  const r = Math.sqrt(rng()) * kmRange // sqrt → uniform on disk
  const theta = rng() * 2 * Math.PI
  const dLat = (r / 111) * Math.sin(theta)
  const dLon = (r / (111 * Math.cos((base[1] * Math.PI) / 180))) * Math.cos(theta)
  return [+(base[0] + dLon).toFixed(5), +(base[1] + dLat).toFixed(5)]
}

function generatePostalCode(rng: () => number): string {
  return `${String(randInt(rng, 0, 99)).padStart(2, '0')}-${String(randInt(rng, 0, 999)).padStart(3, '0')}`
}

function ordersForHub(rng: () => number, hub: Hub, idStart: number): DeliveryOrder[] {
  // Cel ~17 stopów/trasa × liczba tras zwykle planowanych dla huba danego rozmiaru.
  const target =
    hub.size === 'L' ? randInt(rng, 38, 50) : hub.size === 'M' ? randInt(rng, 24, 34) : randInt(rng, 15, 22)
  const orders: DeliveryOrder[] = []
  for (let i = 0; i < target; i++) {
    // Promień 120 km od huba — twardy limit dla mockowanych zleceń
    // (po NN przy ~50 zleceniach na hub średni odcinek między stopami ~14 km).
    const lonLat = randomNear(rng, hub.lonLat, 120)
    const vendor = pick(rng, vendors)
    const parcelCount = randInt(rng, 1, 6)
    const weightKg = randFloat(rng, 50, 220, 1)
    const volumeM3 = randFloat(rng, 0.3, 2.8, 2)
    const isCOD = rng() < 0.18
    const window = pickWindow(rng)

    const numServices = rng() < 0.55 ? randInt(rng, 1, 3) : 0
    const services: OrderService[] = []
    const used = new Set<number>()
    for (let s = 0; s < numServices; s++) {
      const st = pick(rng, serviceTypes)
      if (used.has(st.id)) continue
      used.add(st.id)
      services.push({
        serviceTypeId: st.id,
        durationMin: Math.max(5, st.defaultDurationMin + randInt(rng, -10, 10)),
      })
    }

    const id = idStart + i
    orders.push({
      id,
      number: `ZL/2026/05/${String(id).padStart(5, '0')}`,
      vendorId: vendor.id,
      hubId: hub.id,
      customerName: `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`,
      address: {
        street: `${pick(rng, STREETS)} ${randInt(rng, 1, 199)}`,
        city: hub.city,
        postalCode: generatePostalCode(rng),
      },
      lonLat,
      windowFrom: window[0],
      windowTo: window[1],
      parcelCount,
      weightKg,
      volumeM3,
      isCOD,
      codAmount: isCOD ? randFloat(rng, 200, 8500, 0) : undefined,
      services,
    })
  }
  return orders
}

function vehiclesForHub(hub: Hub): Vehicle[] {
  const vehicles: Vehicle[] = []
  for (let i = 0; i < hub.vehicleCount; i++) {
    const isTruck = i < Math.ceil(hub.vehicleCount * 0.35) // ~35% trucków
    vehicles.push({
      id: hub.id * 1000 + i + 1,
      hubId: hub.id,
      registrationNo: `${hub.symbol}-${String(i + 1).padStart(3, '0')}`,
      type: isTruck ? 'truck' : 'van',
      capacityWeightKg: isTruck ? 8500 : 1200,
      capacityVolumeM3: isTruck ? 35 : 12,
    })
  }
  return vehicles
}

// Główne fabryki.
const SEED = 20260504

export function generateAllVehicles(): Vehicle[] {
  return hubs.flatMap(vehiclesForHub)
}

export function generateAllOrders(): DeliveryOrder[] {
  const rng = mulberry32(SEED)
  const all: DeliveryOrder[] = []
  let idCounter = 100001
  for (const hub of hubs) {
    const batch = ordersForHub(rng, hub, idCounter)
    all.push(...batch)
    idCounter += batch.length
  }
  return all
}

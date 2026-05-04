import type { CarFleetPreset, CarFleetPresetItem } from '@/types/domain'
import { hubs } from './hubs'

// Mockowane presety floty per hub (wzorzec z RouteSolver.CarFleetPreset).
// Każdy duży hub ma kilka presetów (codzienny, weekendowy, świąteczny),
// mniejsze huby zwykle jeden.

const TODAY = '2026-05-04'
const NEXT_MONTH = '2026-06-30'

let nextPresetId = 100
let nextItemId = 1000

function presetWithItems(
  preset: Omit<CarFleetPreset, 'id'>,
  items: Omit<CarFleetPresetItem, 'id' | 'presetId' | 'position'>[],
): { preset: CarFleetPreset; items: CarFleetPresetItem[] } {
  const id = nextPresetId++
  const fullPreset: CarFleetPreset = { id, ...preset }
  const fullItems: CarFleetPresetItem[] = items.map((it, idx) => ({
    id: nextItemId++,
    presetId: id,
    position: idx,
    ...it,
  }))
  return { preset: fullPreset, items: fullItems }
}

const allDays = {
  monday: true, tuesday: true, wednesday: true,
  thursday: true, friday: true, saturday: false, sunday: false,
}
const weekendDays = {
  monday: false, tuesday: false, wednesday: false,
  thursday: false, friday: false, saturday: true, sunday: false,
}

function item(
  weight: number, volume: number, tasks: number, qty: number,
  from: string, to: string,
  days: typeof allDays = allDays,
  remarks = '',
  routeEnd?: [number, number],
): Omit<CarFleetPresetItem, 'id' | 'presetId' | 'position'> {
  return {
    carMaxCargoWeight: weight,
    carMaxCargoVolume: volume,
    workingFrom: from,
    workingTo: to,
    quantity: qty,
    maxTaskCount: tasks,
    suggestedCarId: null,
    employeeIds: [],
    routeEndsInCustomLocation: !!routeEnd,
    routeEndLocation: routeEnd ?? null,
    carSpeedFactor: 1.0,
    userTags: [],
    remarks,
    ...days,
  }
}

const builds: { preset: CarFleetPreset; items: CarFleetPresetItem[] }[] = [
  // WAW — 3 presety
  presetWithItems(
    { name: 'WAW · standard codzienny', hubId: 1, isDefault: true, activeFrom: TODAY, activeTo: NEXT_MONTH, remarks: 'Domyślny preset dla dni roboczych' },
    [
      item(1200, 12, 18, 8, '07:00', '17:00', allDays, 'Małe vany — meble paczkowane'),
      item(3500, 22, 16, 6, '06:30', '17:30', allDays, 'Średnie auta — AGD duże'),
      item(8500, 35, 14, 4, '06:00', '18:00', allDays, 'Duże ciężarówki — pełen ładunek'),
      item(1200, 12, 20, 3, '08:00', '18:00', allDays, '2-osobowa ekipa, dużo montaży'),
      item(3500, 22, 17, 2, '06:00', '16:00', allDays, 'Trasa północna'),
    ],
  ),
  presetWithItems(
    { name: 'WAW · weekend', hubId: 1, isDefault: false, activeFrom: TODAY, activeTo: NEXT_MONTH, remarks: 'Soboty — krótszy dzień' },
    [
      item(1200, 12, 14, 4, '08:00', '15:00', weekendDays, 'Sobota'),
      item(3500, 22, 12, 3, '08:00', '15:00', weekendDays, 'Sobota — większe auta'),
    ],
  ),
  presetWithItems(
    { name: 'WAW · awaryjny', hubId: 1, isDefault: false, activeFrom: TODAY, activeTo: NEXT_MONTH, remarks: 'Plan B — minimum tras' },
    [
      item(3500, 22, 18, 4, '07:00', '17:00', allDays, ''),
    ],
  ),

  // LDZ — 2 presety
  presetWithItems(
    { name: 'LDZ · podstawowy', hubId: 3, isDefault: true, activeFrom: TODAY, activeTo: NEXT_MONTH, remarks: '' },
    [
      item(1200, 12, 17, 6, '07:00', '17:00', allDays, ''),
      item(3500, 22, 16, 5, '07:00', '17:00', allDays, ''),
      item(8500, 35, 13, 3, '06:30', '18:00', allDays, 'Pełen ładunek mebli'),
    ],
  ),
  presetWithItems(
    { name: 'LDZ · weekendowy', hubId: 3, isDefault: false, activeFrom: TODAY, activeTo: NEXT_MONTH, remarks: '' },
    [
      item(1200, 12, 14, 4, '08:00', '15:00', weekendDays, ''),
      item(3500, 22, 13, 2, '08:00', '15:00', weekendDays, ''),
    ],
  ),

  // KAT — 2 presety
  presetWithItems(
    { name: 'KAT · pełna flota', hubId: 2, isDefault: true, activeFrom: TODAY, activeTo: NEXT_MONTH, remarks: '' },
    [
      item(1200, 12, 18, 7, '06:30', '17:00', allDays, ''),
      item(3500, 22, 17, 6, '06:30', '17:00', allDays, ''),
      item(8500, 35, 14, 3, '06:00', '18:00', allDays, ''),
    ],
  ),
  presetWithItems(
    { name: 'KAT · brand Samsung', hubId: 2, isDefault: false, activeFrom: TODAY, activeTo: NEXT_MONTH, remarks: 'Tylko dostawy z marką Samsung' },
    [
      { ...item(3500, 22, 12, 4, '08:00', '17:00', allDays, 'Dostawy SAMSUNG'), userTags: ['SAMSUNG_BRANDED_DELIVERY'] },
      { ...item(8500, 35, 10, 2, '08:00', '17:00', allDays, 'Pełen ładunek SAMSUNG'), userTags: ['SAMSUNG_BRANDED_DELIVERY'] },
    ],
  ),

  // WRO
  presetWithItems(
    { name: 'WRO · standard', hubId: 13, isDefault: true, activeFrom: TODAY, activeTo: NEXT_MONTH, remarks: '' },
    [
      item(1200, 12, 18, 5, '07:00', '17:00', allDays, ''),
      item(3500, 22, 16, 4, '07:00', '17:00', allDays, ''),
      item(8500, 35, 13, 2, '06:30', '18:00', allDays, ''),
    ],
  ),

  // POZ
  presetWithItems(
    { name: 'POZ · standard', hubId: 4, isDefault: true, activeFrom: TODAY, activeTo: NEXT_MONTH, remarks: '' },
    [
      item(1200, 12, 17, 5, '07:00', '17:00', allDays, ''),
      item(3500, 22, 16, 4, '07:00', '17:00', allDays, ''),
      item(8500, 35, 13, 2, '06:30', '18:00', allDays, ''),
    ],
  ),

  // KRA — z trasą kończącą w punkcie niestandardowym
  presetWithItems(
    { name: 'KRA · z dojazdem do garażu', hubId: 11, isDefault: true, activeFrom: TODAY, activeTo: NEXT_MONTH, remarks: 'Trasy kończą w garażu na Płaszowie zamiast w hubie' },
    [
      item(1200, 12, 17, 4, '07:00', '17:00', allDays, '', [19.97, 50.04]),
      item(3500, 22, 16, 3, '07:00', '17:00', allDays, '', [19.97, 50.04]),
    ],
  ),

  // GDA / RZE / BYD itp. — po jednym domyślnym
  ...hubs.filter((h) => [7, 16, 8, 10, 5, 34, 9, 33, 14].includes(h.id)).map((h) =>
    presetWithItems(
      {
        name: `${h.symbol} · standard`,
        hubId: h.id,
        isDefault: true,
        activeFrom: TODAY,
        activeTo: NEXT_MONTH,
        remarks: '',
      },
      h.size === 'L'
        ? [
            item(1200, 12, 17, 4, '07:00', '17:00', allDays, ''),
            item(3500, 22, 16, 3, '07:00', '17:00', allDays, ''),
            item(8500, 35, 13, 2, '06:30', '18:00', allDays, ''),
          ]
        : h.size === 'M'
          ? [
              item(1200, 12, 17, 3, '07:00', '17:00', allDays, ''),
              item(3500, 22, 16, 2, '07:00', '17:00', allDays, ''),
            ]
          : [
              item(1200, 12, 17, 2, '07:30', '16:30', allDays, ''),
              item(3500, 22, 15, 1, '07:30', '16:30', allDays, ''),
            ],
    ),
  ),
]

export const seedPresets: CarFleetPreset[] = builds.map((b) => b.preset)
export const seedPresetItems: CarFleetPresetItem[] = builds.flatMap((b) => b.items)

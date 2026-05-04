import { computed, reactive, ref, watch } from 'vue'
import type { CarFleetPreset, CarFleetPresetItem } from '@/types/domain'
import { hubById } from '@/data/hubs'
import { seedPresets, seedPresetItems } from '@/data/presets'

const STORAGE_KEY = 'planning3-presets-state'

interface PersistedState {
  presets: CarFleetPreset[]
  items: CarFleetPresetItem[]
  selectedPresetId: number | null
  searchText: string
  hubFilterId: number | null
  dayFilters: { mon: boolean; tue: boolean; wed: boolean; thu: boolean; fri: boolean; sat: boolean; sun: boolean }
}

function load(): Partial<PersistedState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function save(state: PersistedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

const persisted = load()

const state = reactive({
  presets: (persisted.presets ?? seedPresets) as CarFleetPreset[],
  items: (persisted.items ?? seedPresetItems) as CarFleetPresetItem[],
  selectedPresetId: persisted.selectedPresetId ?? null,
  searchText: persisted.searchText ?? '',
  hubFilterId: persisted.hubFilterId ?? null,
  dayFilters: persisted.dayFilters ?? {
    mon: false, tue: false, wed: false, thu: false, fri: false, sat: false, sun: false,
  },
})

// ulotne ID liczone od max + 1, żeby nowe wpisy nie kolidowały z seedem
let nextPresetId = Math.max(0, ...state.presets.map((p) => p.id)) + 1
let nextItemId = Math.max(0, ...state.items.map((i) => i.id)) + 1

watch(
  () => ({
    presets: state.presets,
    items: state.items,
    selectedPresetId: state.selectedPresetId,
    searchText: state.searchText,
    hubFilterId: state.hubFilterId,
    dayFilters: state.dayFilters,
  }),
  (v) => save(v as PersistedState),
  { deep: true },
)

// modale
const presetFormOpen = ref(false)
const editingPreset = ref<CarFleetPreset | null>(null) // null = tworzymy nowy

const itemFormOpen = ref(false)
const editingItem = ref<CarFleetPresetItem | null>(null)

const filteredPresets = computed(() => {
  const search = state.searchText.trim().toLowerCase()
  return state.presets.filter((p) => {
    if (state.hubFilterId !== null && p.hubId !== state.hubFilterId) return false
    if (search) {
      const hub = hubById.get(p.hubId)
      const hay = `${p.name} ${p.remarks} ${hub?.name ?? ''} ${hub?.symbol ?? ''}`.toLowerCase()
      if (!hay.includes(search)) return false
    }
    return true
  })
})

const selectedPreset = computed(() =>
  state.presets.find((p) => p.id === state.selectedPresetId) ?? null,
)

const selectedItems = computed(() => {
  if (!state.selectedPresetId) return []
  const items = state.items.filter((i) => i.presetId === state.selectedPresetId)
  const f = state.dayFilters
  const anyDay = f.mon || f.tue || f.wed || f.thu || f.fri || f.sat || f.sun
  if (!anyDay) return items.sort((a, b) => a.position - b.position)
  return items
    .filter(
      (i) =>
        (f.mon && i.monday) ||
        (f.tue && i.tuesday) ||
        (f.wed && i.wednesday) ||
        (f.thu && i.thursday) ||
        (f.fri && i.friday) ||
        (f.sat && i.saturday) ||
        (f.sun && i.sunday),
    )
    .sort((a, b) => a.position - b.position)
})

const totals = computed(() => {
  const items = selectedItems.value
  return {
    weight: items.reduce((s, i) => s + i.carMaxCargoWeight * i.quantity, 0),
    volume: items.reduce((s, i) => s + i.carMaxCargoVolume * i.quantity, 0),
    tasks: items.reduce((s, i) => s + i.maxTaskCount * i.quantity, 0),
    quantity: items.reduce((s, i) => s + i.quantity, 0),
  }
})

function selectPreset(id: number | null) {
  state.selectedPresetId = id
}

function openCreatePreset() {
  editingPreset.value = null
  presetFormOpen.value = true
}
function openEditPreset(preset: CarFleetPreset) {
  editingPreset.value = preset
  presetFormOpen.value = true
}
function savePreset(data: Omit<CarFleetPreset, 'id'>) {
  if (editingPreset.value) {
    const idx = state.presets.findIndex((p) => p.id === editingPreset.value!.id)
    if (idx >= 0) state.presets[idx] = { ...state.presets[idx]!, ...data }
  } else {
    const id = nextPresetId++
    const created: CarFleetPreset = { id, ...data }
    state.presets = [created, ...state.presets]
    state.selectedPresetId = id
  }
  presetFormOpen.value = false
}
function deletePreset(id: number) {
  state.presets = state.presets.filter((p) => p.id !== id)
  state.items = state.items.filter((i) => i.presetId !== id)
  if (state.selectedPresetId === id) state.selectedPresetId = null
}
function closePresetForm() {
  presetFormOpen.value = false
}

function openCreateItem() {
  if (!state.selectedPresetId) return
  editingItem.value = null
  itemFormOpen.value = true
}
function openEditItem(it: CarFleetPresetItem) {
  editingItem.value = it
  itemFormOpen.value = true
}
function saveItem(data: Omit<CarFleetPresetItem, 'id' | 'presetId' | 'position'>) {
  if (editingItem.value) {
    const idx = state.items.findIndex((i) => i.id === editingItem.value!.id)
    if (idx >= 0) state.items[idx] = { ...state.items[idx]!, ...data }
  } else if (state.selectedPresetId) {
    const presetItems = state.items.filter((i) => i.presetId === state.selectedPresetId)
    const id = nextItemId++
    const item: CarFleetPresetItem = {
      id,
      presetId: state.selectedPresetId,
      position: presetItems.length,
      ...data,
    }
    state.items = [...state.items, item]
  }
  itemFormOpen.value = false
}
function deleteItem(id: number) {
  state.items = state.items.filter((i) => i.id !== id)
}
function closeItemForm() {
  itemFormOpen.value = false
}

function resetSeed() {
  state.presets = [...seedPresets]
  state.items = [...seedPresetItems]
  state.selectedPresetId = null
  nextPresetId = Math.max(0, ...state.presets.map((p) => p.id)) + 1
  nextItemId = Math.max(0, ...state.items.map((i) => i.id)) + 1
}

export function usePresets() {
  return {
    state,
    filteredPresets,
    selectedPreset,
    selectedItems,
    totals,
    presetFormOpen,
    editingPreset,
    itemFormOpen,
    editingItem,
    selectPreset,
    openCreatePreset,
    openEditPreset,
    savePreset,
    deletePreset,
    closePresetForm,
    openCreateItem,
    openEditItem,
    saveItem,
    deleteItem,
    closeItemForm,
    resetSeed,
    hubById,
  }
}

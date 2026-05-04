<script setup lang="ts">
import { computed } from 'vue'
import {
  X,
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Search,
  Star,
  RotateCcw,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { hubs } from '@/data/hubs'
import { usePresets } from '@/composables/usePresets'
import PresetForm from './PresetForm.vue'
import PresetItemForm from './PresetItemForm.vue'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const presets = usePresets()
const {
  state,
  filteredPresets,
  selectedPreset,
  selectedItems,
  totals,
  presetFormOpen,
  editingPreset,
  itemFormOpen,
  editingItem,
} = presets

const view = computed<'list' | 'detail'>(() =>
  selectedPreset.value ? 'detail' : 'list',
)

const DAYS: { key: keyof typeof state.dayFilters; label: string; itemKey: keyof typeof selectedItems.value[number] }[] = [
  { key: 'mon', label: 'Pn', itemKey: 'monday' },
  { key: 'tue', label: 'Wt', itemKey: 'tuesday' },
  { key: 'wed', label: 'Śr', itemKey: 'wednesday' },
  { key: 'thu', label: 'Cz', itemKey: 'thursday' },
  { key: 'fri', label: 'Pt', itemKey: 'friday' },
  { key: 'sat', label: 'Sb', itemKey: 'saturday' },
  { key: 'sun', label: 'Nd', itemKey: 'sunday' },
]

function fmtKg(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)} t` : `${n.toFixed(0)} kg`
}
function itemCountFor(presetId: number) {
  return state.items.filter((i) => i.presetId === presetId).length
}

function handleDeletePreset(id: number) {
  if (confirm('Usunąć preset wraz z wpisami floty?')) presets.deletePreset(id)
}
function handleDeleteItem(id: number) {
  if (confirm('Usunąć ten wpis?')) presets.deleteItem(id)
}
function handleResetSeed() {
  if (confirm('Przywrócić oryginalne presety i odrzucić zmiany?')) presets.resetSeed()
}
</script>

<template>
  <Transition
    enter-active-class="transition-transform duration-300 ease-out"
    leave-active-class="transition-transform duration-200 ease-in"
    enter-from-class="-translate-x-full"
    leave-to-class="-translate-x-full"
  >
    <aside
      v-if="open"
      class="absolute inset-y-0 left-0 z-20 flex h-full w-full max-w-[32rem] flex-col border-r border-border bg-background/95 shadow-2xl backdrop-blur"
    >
      <header class="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div class="flex items-center gap-2">
          <Button v-if="view === 'detail'" variant="ghost" size="icon" aria-label="Wróć" @click="presets.selectPreset(null)">
            <ArrowLeft />
          </Button>
          <div>
            <h2 class="text-base font-semibold leading-tight">
              <template v-if="view === 'list'">Presety floty</template>
              <template v-else-if="selectedPreset">{{ selectedPreset.name }}</template>
            </h2>
            <p v-if="view === 'list'" class="text-xs text-muted-foreground">
              {{ filteredPresets.length }} z {{ state.presets.length }} presetów
            </p>
            <p v-else-if="selectedPreset" class="text-xs text-muted-foreground">
              {{ presets.hubById.get(selectedPreset.hubId)?.symbol }} ·
              {{ selectedItems.length }} wpisów
              <template v-if="selectedPreset.isDefault"> · domyślny</template>
            </p>
          </div>
        </div>
        <div class="flex items-center gap-1">
          <Button v-if="view === 'list'" variant="ghost" size="icon" :title="'Przywróć dane przykładowe'" @click="handleResetSeed">
            <RotateCcw />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Zamknij panel" @click="emit('close')">
            <X />
          </Button>
        </div>
      </header>

      <!-- ============== LIST ============== -->
      <div v-if="view === 'list'" class="flex flex-1 min-h-0 flex-col">
        <div class="space-y-2 border-b border-border p-3">
          <div class="relative">
            <Search class="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              v-model="state.searchText"
              type="text"
              placeholder="Szukaj po nazwie / oddziale / uwagach"
              class="w-full rounded-md border border-input bg-background pl-7 pr-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div class="flex items-center gap-2">
            <select
              v-model.number="state.hubFilterId"
              class="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option :value="null">Wszystkie oddziały</option>
              <option v-for="h in hubs" :key="h.id" :value="h.id">{{ h.symbol }} — {{ h.name }}</option>
            </select>
            <Button size="sm" class="shrink-0" @click="presets.openCreatePreset()">
              <Plus />
              Dodaj
            </Button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto">
          <ul v-if="filteredPresets.length" class="divide-y divide-border">
            <li
              v-for="p in filteredPresets"
              :key="p.id"
              class="cursor-pointer px-3 py-2 transition-colors hover:bg-accent/40"
              @click="presets.selectPreset(p.id)"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5 text-sm font-semibold">
                    <span class="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                      {{ presets.hubById.get(p.hubId)?.symbol }}
                    </span>
                    <span class="truncate">{{ p.name }}</span>
                    <Star v-if="p.isDefault" class="size-3.5 fill-amber-400 text-amber-400" />
                  </div>
                  <p v-if="p.remarks" class="truncate text-[11px] italic text-muted-foreground">
                    „{{ p.remarks }}"
                  </p>
                  <p class="text-[10px] text-muted-foreground">
                    {{ itemCountFor(p.id) }} wpisów
                    <template v-if="p.activeFrom && p.activeTo"> · {{ p.activeFrom }} → {{ p.activeTo }}</template>
                  </p>
                </div>
                <div class="flex shrink-0 gap-1" @click.stop>
                  <Button variant="ghost" size="icon" class="h-7 w-7" :title="'Edytuj preset'" @click="presets.openEditPreset(p)">
                    <Pencil class="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" class="h-7 w-7 text-destructive hover:text-destructive" :title="'Usuń'" @click="handleDeletePreset(p.id)">
                    <Trash2 class="size-3.5" />
                  </Button>
                </div>
              </div>
            </li>
          </ul>
          <div v-else class="p-8 text-center text-sm text-muted-foreground">
            Brak presetów spełniających filtry.
          </div>
        </div>
      </div>

      <!-- ============== DETAIL ============== -->
      <div v-else-if="view === 'detail' && selectedPreset" class="flex flex-1 min-h-0 flex-col">
        <!-- Karta presetu (meta) -->
        <div class="border-b border-border bg-muted/30 px-3 py-2 text-xs">
          <div class="flex items-center justify-between gap-2">
            <div class="grid flex-1 grid-cols-2 gap-x-3 gap-y-0.5">
              <div>
                <span class="text-muted-foreground">Oddział: </span>
                <span class="font-medium">{{ presets.hubById.get(selectedPreset.hubId)?.name }}</span>
              </div>
              <div>
                <span class="text-muted-foreground">Domyślny: </span>
                <span class="font-medium">{{ selectedPreset.isDefault ? 'tak' : 'nie' }}</span>
              </div>
              <div class="col-span-2 truncate" v-if="selectedPreset.remarks">
                <span class="text-muted-foreground">Uwagi: </span>
                {{ selectedPreset.remarks }}
              </div>
              <div class="col-span-2">
                <span class="text-muted-foreground">Aktywny: </span>
                {{ selectedPreset.activeFrom ?? '—' }} → {{ selectedPreset.activeTo ?? '—' }}
              </div>
            </div>
            <Button variant="outline" size="sm" class="h-7 px-2 text-[11px]" @click="presets.openEditPreset(selectedPreset)">
              <Pencil class="size-3" />
              Edytuj
            </Button>
          </div>
        </div>

        <!-- Toolbar items -->
        <div class="flex flex-wrap items-center gap-1.5 border-b border-border px-3 py-2">
          <Button size="sm" class="h-7 px-2 text-[11px]" @click="presets.openCreateItem()">
            <Plus class="size-3" />
            Dodaj wpis
          </Button>
          <span class="ml-2 text-[10px] text-muted-foreground">Pokaż dni:</span>
          <label
            v-for="d in DAYS"
            :key="d.key"
            :class="cn(
              'inline-flex cursor-pointer items-center justify-center rounded border border-input px-2 py-0.5 text-[10px] font-medium transition-colors',
              state.dayFilters[d.key] ? 'bg-primary text-primary-foreground' : 'hover:bg-accent/50',
            )"
          >
            <input :checked="state.dayFilters[d.key]" type="checkbox" class="sr-only" @change="state.dayFilters[d.key] = ($event.target as HTMLInputElement).checked" />
            {{ d.label }}
          </label>
        </div>

        <!-- Items table-like list -->
        <div class="flex-1 overflow-y-auto">
          <ul v-if="selectedItems.length" class="divide-y divide-border">
            <li v-for="it in selectedItems" :key="it.id" class="px-3 py-2 text-xs">
              <div class="flex items-start gap-2">
                <span class="mt-0.5 inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded bg-muted px-1.5 text-[10px] font-bold">
                  ×{{ it.quantity }}
                </span>
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                    <span class="font-mono font-semibold">{{ fmtKg(it.carMaxCargoWeight) }}</span>
                    <span class="font-mono">{{ it.carMaxCargoVolume.toFixed(1) }} m³</span>
                    <span class="font-mono">{{ it.maxTaskCount }} zad.</span>
                    <span class="font-mono">{{ it.workingFrom }}–{{ it.workingTo }}</span>
                    <span v-if="it.carSpeedFactor !== 1" class="text-muted-foreground">×{{ it.carSpeedFactor.toFixed(2) }} prędk.</span>
                  </div>
                  <div class="mt-0.5 flex flex-wrap items-center gap-x-1 text-[10px] text-muted-foreground">
                    <span
                      v-for="d in DAYS"
                      :key="d.key"
                      :class="cn(
                        'rounded px-1 font-mono',
                        (it as any)[d.itemKey] ? 'bg-primary/15 text-foreground' : 'opacity-30',
                      )"
                    >{{ d.label }}</span>
                    <template v-if="it.userTags.length > 0">
                      <span class="ml-2">·</span>
                      <span v-for="t in it.userTags" :key="t" class="rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 dark:text-amber-300">
                        {{ t.replace('SAMSUNG_BRANDED_DELIVERY', 'Samsung') }}
                      </span>
                    </template>
                    <span v-if="it.routeEndsInCustomLocation" class="ml-2 rounded bg-sky-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-sky-700 dark:text-sky-300">
                      koniec w lokalizacji
                    </span>
                  </div>
                  <p v-if="it.remarks" class="mt-0.5 truncate text-[10px] italic text-muted-foreground">
                    „{{ it.remarks }}"
                  </p>
                </div>
                <div class="flex shrink-0 gap-1" @click.stop>
                  <Button variant="ghost" size="icon" class="h-7 w-7" :title="'Edytuj'" @click="presets.openEditItem(it)">
                    <Pencil class="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" class="h-7 w-7 text-destructive hover:text-destructive" :title="'Usuń'" @click="handleDeleteItem(it.id)">
                    <Trash2 class="size-3.5" />
                  </Button>
                </div>
              </div>
            </li>
          </ul>
          <div v-else class="p-8 text-center text-sm text-muted-foreground">
            Brak wpisów. Kliknij <span class="font-semibold">Dodaj wpis</span>, aby utworzyć pierwszy.
          </div>
        </div>

        <!-- Sums footer -->
        <footer class="border-t border-border bg-muted/30 px-3 py-2 text-[11px]">
          <div class="grid grid-cols-4 gap-2">
            <div>
              <div class="text-muted-foreground">Razem pojazdów</div>
              <div class="font-mono font-semibold">{{ totals.quantity }}</div>
            </div>
            <div>
              <div class="text-muted-foreground">Suma wagi</div>
              <div class="font-mono font-semibold">{{ fmtKg(totals.weight) }}</div>
            </div>
            <div>
              <div class="text-muted-foreground">Suma objętości</div>
              <div class="font-mono font-semibold">{{ totals.volume.toFixed(1) }} m³</div>
            </div>
            <div>
              <div class="text-muted-foreground">Suma zadań</div>
              <div class="font-mono font-semibold">{{ totals.tasks }}</div>
            </div>
          </div>
        </footer>
      </div>
    </aside>
  </Transition>

  <!-- modale na poziomie body przez <Teleport> -->
  <PresetForm
    :open="presetFormOpen"
    :preset="editingPreset"
    @close="presets.closePresetForm()"
    @save="(d) => presets.savePreset(d)"
  />
  <PresetItemForm
    :open="itemFormOpen"
    :item="editingItem"
    @close="presets.closeItemForm()"
    @save="(d) => presets.saveItem(d)"
  />
</template>

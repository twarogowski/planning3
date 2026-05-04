<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  X,
  Play,
  Loader2,
  CheckCircle2,
  Archive,
  ArrowLeft,
  ListChecks,
  Truck,
  Package,
  Weight,
  Clock,
  Wrench,
  MapPin,
  ChevronRight,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import DatePicker from '@/components/ui/DatePicker.vue'
import { cn } from '@/lib/utils'
import { hubs } from '@/data/hubs'
import { vendorById } from '@/data/vendors'
import { serviceTypeById } from '@/data/serviceTypes'
import { usePlanner } from '@/composables/usePlanner'
import type { RoutePlan, Stop } from '@/types/domain'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const planner = usePlanner()
const {
  state,
  summaryByHub,
  ordersForSelected,
  vehiclesForSelected,
  currentRun,
  selectedSolution,
  selectedRoute,
  selectedRouteId,
} = planner

const SOLUTION_STATUS: Record<string, { label: string; class: string }> = {
  pending: { label: 'Do akceptu', class: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  approved: { label: 'Zatwierdzone', class: 'bg-green-500/15 text-green-700 dark:text-green-300' },
  archived: { label: 'Archiwum', class: 'bg-muted text-muted-foreground' },
}

const totalOrders = computed(() => ordersForSelected.value.length)
const totalVehicles = computed(() => vehiclesForSelected.value.length)
const canStart = computed(() => state.selectedHubIds.length > 0 && totalOrders.value > 0)

function fmtPLN(n: number) {
  return n.toLocaleString('pl-PL', { maximumFractionDigits: 0 }) + ' PLN'
}
function fmtKm(n: number) {
  return n.toLocaleString('pl-PL', { maximumFractionDigits: 1 }) + ' km'
}
function fmtMin(n: number) {
  const h = Math.floor(n / 60)
  const m = Math.round(n % 60)
  return h ? `${h} h ${m} min` : `${m} min`
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' })
}

const orderById = computed(() => {
  const m = new Map<number, (typeof planner.allOrders)[number]>()
  for (const o of planner.allOrders) m.set(o.id, o)
  return m
})

function vendorName(id: number) {
  return vendorById.get(id)?.displayName ?? `Vendor #${id}`
}

function serviceName(id: number) {
  return serviceTypeById.get(id)?.name ?? `Usługa #${id}`
}

function totalServiceMin(stop: Stop) {
  const o = orderById.value.get(stop.orderId)
  if (!o) return 0
  return o.services.reduce((s, x) => s + x.durationMin, 0)
}

const tab = ref<'list' | 'route'>('list')

function pickRoute(r: RoutePlan) {
  planner.selectRoute(r.id)
  tab.value = 'route'
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
      class="absolute inset-y-0 left-0 z-20 flex h-full w-full max-w-[28rem] flex-col border-r border-border bg-background/95 shadow-2xl backdrop-blur"
    >
      <header class="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div class="flex items-center gap-2">
          <Button v-if="state.view === 'solution-detail'" variant="ghost" size="icon" aria-label="Wróć" @click="planner.backToSolutions()">
            <ArrowLeft />
          </Button>
          <div>
            <h2 class="text-base font-semibold leading-tight">
              <template v-if="state.view === 'setup'">Planowanie tras</template>
              <template v-else-if="state.view === 'running'">Optymalizacja w toku</template>
              <template v-else-if="state.view === 'solutions'">Rozwiązania</template>
              <template v-else-if="state.view === 'solution-detail'">Rozwiązanie</template>
            </h2>
            <p v-if="state.view === 'setup'" class="text-xs text-muted-foreground">
              Wybierz oddziały i datę, następnie uruchom solver PTV.
            </p>
            <p v-else-if="state.view === 'running'" class="text-xs text-muted-foreground">
              Zwykle 5–10 minut. Możesz wyłączyć panel — wrócisz do wyniku.
            </p>
            <p v-else-if="state.view === 'solutions'" class="text-xs text-muted-foreground">
              {{ state.solutions.length }} {{ state.solutions.length === 1 ? 'rozwiązanie' : 'rozwiązań' }} w pamięci
            </p>
            <p v-else-if="state.view === 'solution-detail' && selectedSolution" class="text-xs text-muted-foreground">
              {{ selectedSolution.routes.length }} tras · {{ fmtDate(selectedSolution.createdAt) }}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" aria-label="Zamknij panel" @click="emit('close')">
          <X />
        </Button>
      </header>

      <!-- Toolbar przełącznik widoków -->
      <nav v-if="state.view !== 'solution-detail'" class="flex border-b border-border text-xs">
        <button
          :class="cn('flex-1 px-3 py-2 font-medium transition-colors',
            state.view === 'setup' ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50')"
          @click="planner.backToSetup()"
        >
          1. Setup
        </button>
        <button
          :class="cn('flex-1 px-3 py-2 font-medium transition-colors',
            state.view === 'running' ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
            state.view !== 'running' && 'opacity-50 pointer-events-none')"
        >
          2. Solver
        </button>
        <button
          :class="cn('flex-1 px-3 py-2 font-medium transition-colors',
            state.view === 'solutions' ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
            state.solutions.length === 0 && 'opacity-50 pointer-events-none')"
          @click="planner.goSolutions()"
        >
          3. Rozwiązania ({{ state.solutions.length }})
        </button>
      </nav>

      <!-- ============== SETUP ============== -->
      <div v-if="state.view === 'setup'" class="flex-1 overflow-y-auto">
        <div class="space-y-4 p-4">
          <div>
            <label class="mb-1 block text-xs font-medium">Data dystrybucji</label>
            <DatePicker v-model="state.selectedDate" />
          </div>

          <div>
            <div class="mb-1 flex items-center justify-between">
              <label class="text-xs font-medium">Centra logistyczne</label>
              <div class="flex gap-1">
                <Button variant="ghost" size="sm" class="h-6 px-2 text-[10px]" @click="planner.selectAllHubs()">Wszystkie</Button>
                <Button variant="ghost" size="sm" class="h-6 px-2 text-[10px]" @click="planner.clearHubs()">Żadne</Button>
              </div>
            </div>
            <ul class="grid gap-1.5">
              <li v-for="row in summaryByHub" :key="row.hub.id">
                <button
                  type="button"
                  :class="cn(
                    'flex w-full items-center gap-2 rounded-md border border-border px-2 py-1.5 text-left text-xs transition-colors',
                    row.selected ? 'bg-accent border-primary' : 'hover:bg-accent/50',
                  )"
                  @click="planner.toggleHub(row.hub.id)"
                >
                  <span :class="cn(
                    'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold',
                    row.selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                  )">{{ row.hub.symbol }}</span>
                  <span class="min-w-0 flex-1 truncate font-medium">{{ row.hub.name }}</span>
                  <span class="text-muted-foreground">{{ row.orderCount }} zl · {{ row.vehicleCount }} 🚐</span>
                </button>
              </li>
            </ul>
          </div>

          <div>
            <label class="mb-1 block text-xs font-medium">Opis (opcjonalnie)</label>
            <textarea
              v-model="state.description"
              rows="2"
              placeholder="Np. plan na poniedziałek, priorytet trasy AGD"
              class="w-full resize-y rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div class="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
            <div class="mb-1 font-semibold">Podsumowanie</div>
            <div class="flex items-center justify-between">
              <span class="text-muted-foreground">Zlecenia do zaplanowania</span>
              <span class="font-mono font-semibold">{{ totalOrders }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-muted-foreground">Pojazdy dostępne</span>
              <span class="font-mono font-semibold">{{ totalVehicles }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-muted-foreground">Wybranych oddziałów</span>
              <span class="font-mono font-semibold">{{ state.selectedHubIds.length }} / {{ hubs.length }}</span>
            </div>
          </div>

          <Button :disabled="!canStart" class="w-full" size="lg" @click="planner.startOptimization()">
            <Play />
            Uruchom optymalizację
          </Button>
        </div>
      </div>

      <!-- ============== RUNNING ============== -->
      <div v-else-if="state.view === 'running'" class="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <div class="text-center">
          <Loader2 class="mx-auto size-10 animate-spin text-primary" />
          <p class="mt-3 text-sm font-medium">Solver PTV pracuje…</p>
          <p class="mt-1 text-xs text-muted-foreground">
            {{ currentRun ? fmtDate(currentRun.startedAt) : '' }}
          </p>
        </div>

        <div class="w-full">
          <div class="mb-1 flex items-center justify-between text-xs">
            <span class="text-muted-foreground">Postęp</span>
            <span class="font-mono">{{ Math.round(currentRun?.progressPct ?? 0) }}%</span>
          </div>
          <div class="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div class="h-full bg-primary transition-all" :style="{ width: (currentRun?.progressPct ?? 0) + '%' }" />
          </div>
        </div>

        <div class="grid w-full grid-cols-2 gap-2 text-xs">
          <div class="rounded-md border border-border px-3 py-2">
            <div class="text-muted-foreground">Oddziały</div>
            <div class="font-semibold">{{ state.selectedHubIds.length }}</div>
          </div>
          <div class="rounded-md border border-border px-3 py-2">
            <div class="text-muted-foreground">Zlecenia</div>
            <div class="font-semibold">{{ totalOrders }}</div>
          </div>
        </div>

        <Button variant="outline" size="sm" @click="planner.cancelOptimization()">Anuluj</Button>
      </div>

      <!-- ============== SOLUTIONS ============== -->
      <div v-else-if="state.view === 'solutions'" class="flex-1 overflow-y-auto">
        <ul v-if="state.solutions.length" class="divide-y divide-border">
          <li
            v-for="sol in state.solutions"
            :key="sol.id"
            class="cursor-pointer px-4 py-3 transition-colors hover:bg-accent/40"
            @click="planner.openSolution(sol.id)"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="flex items-center gap-2 text-sm font-semibold">
                  <span>{{ sol.date }}</span>
                  <span :class="cn('rounded-full px-2 py-0.5 text-[10px] font-medium', SOLUTION_STATUS[sol.status]?.class)">
                    {{ SOLUTION_STATUS[sol.status]?.label }}
                  </span>
                </div>
                <p class="truncate text-xs text-muted-foreground">
                  {{ sol.hubIds.map((id) => planner.hubById.get(id)?.symbol).join(' · ') }}
                </p>
                <p v-if="sol.description" class="mt-0.5 truncate text-[11px] italic text-muted-foreground">
                  „{{ sol.description }}"
                </p>
              </div>
              <ChevronRight class="size-4 shrink-0 text-muted-foreground" />
            </div>

            <div class="mt-2 grid grid-cols-2 gap-1 text-[11px]">
              <div class="flex items-center gap-1">
                <Truck class="size-3.5 text-muted-foreground" />
                <span class="font-mono">{{ sol.vehiclesUsed }}/{{ sol.vehiclesAvailable }}</span>
                <span class="text-muted-foreground">pojazdów</span>
              </div>
              <div class="flex items-center gap-1">
                <ListChecks class="size-3.5 text-muted-foreground" />
                <span class="font-mono">{{ sol.ordersPlanned }}/{{ sol.ordersTotal }}</span>
                <span class="text-muted-foreground">zleceń</span>
              </div>
              <div class="flex items-center gap-1">
                <MapPin class="size-3.5 text-muted-foreground" />
                <span class="font-mono">{{ fmtKm(sol.totalDistanceKm) }}</span>
              </div>
              <div class="flex items-center gap-1">
                <span class="text-muted-foreground">≈</span>
                <span class="font-mono font-semibold">{{ fmtPLN(sol.totalCostPLN) }}</span>
              </div>
            </div>

            <div class="mt-2 flex gap-1.5" @click.stop>
              <Button
                v-if="sol.status !== 'approved'"
                variant="default"
                size="sm"
                class="h-7 px-2 text-[11px]"
                @click="planner.approveSolution(sol.id)"
              >
                <CheckCircle2 class="size-3" />
                Zatwierdź
              </Button>
              <Button
                variant="outline"
                size="sm"
                class="h-7 px-2 text-[11px]"
                @click="planner.archiveSolution(sol.id)"
              >
                <Archive class="size-3" />
                Archiwizuj
              </Button>
            </div>
          </li>
        </ul>
        <div v-else class="p-8 text-center text-sm text-muted-foreground">
          Brak rozwiązań. Wróć do <button class="underline" @click="planner.backToSetup()">Setup</button>, żeby uruchomić solver.
        </div>
      </div>

      <!-- ============== SOLUTION DETAIL ============== -->
      <div v-else-if="state.view === 'solution-detail' && selectedSolution" class="flex flex-1 min-h-0 flex-col">
        <!-- Sub-tabs trasy / wybrana trasa -->
        <nav class="flex border-b border-border text-xs">
          <button
            :class="cn('flex-1 px-3 py-2 font-medium transition-colors',
              tab === 'list' ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50')"
            @click="tab = 'list'"
          >
            Trasy ({{ selectedSolution.routes.length }})
          </button>
          <button
            :class="cn('flex-1 px-3 py-2 font-medium transition-colors',
              tab === 'route' ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
              !selectedRoute && 'opacity-50 pointer-events-none')"
            @click="tab = 'route'"
          >
            Stopy {{ selectedRoute ? '(' + selectedRoute.stops.length + ')' : '' }}
          </button>
        </nav>

        <!-- Stats bar -->
        <div class="grid grid-cols-3 gap-2 border-b border-border px-3 py-2 text-[11px]">
          <div>
            <div class="text-muted-foreground">Dystans</div>
            <div class="font-mono font-semibold">{{ fmtKm(selectedSolution.totalDistanceKm) }}</div>
          </div>
          <div>
            <div class="text-muted-foreground">Koszt</div>
            <div class="font-mono font-semibold">{{ fmtPLN(selectedSolution.totalCostPLN) }}</div>
          </div>
          <div>
            <div class="text-muted-foreground">Pojazdy</div>
            <div class="font-mono font-semibold">{{ selectedSolution.vehiclesUsed }}/{{ selectedSolution.vehiclesAvailable }}</div>
          </div>
        </div>

        <!-- ==== TAB: routes list ==== -->
        <div v-if="tab === 'list'" class="flex-1 overflow-y-auto">
          <ul class="divide-y divide-border">
            <li
              v-for="r in selectedSolution.routes"
              :key="r.id"
              :class="cn(
                'cursor-pointer px-3 py-2 transition-colors hover:bg-accent/40',
                selectedRouteId === r.id && 'bg-accent',
              )"
              @click="pickRoute(r)"
              @mouseenter="planner.selectRoute(r.id)"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5 text-sm font-semibold">
                    <span class="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                      {{ planner.hubById.get(r.hubId)?.symbol }}
                    </span>
                    <span class="truncate">{{ r.driverName }}</span>
                  </div>
                  <div class="text-[11px] text-muted-foreground">
                    {{ r.helperName ? r.helperName + ' · ' : '' }}{{ r.startAt }} → {{ r.endAt }}
                  </div>
                </div>
                <ChevronRight class="size-4 shrink-0 text-muted-foreground" />
              </div>
              <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]">
                <span class="flex items-center gap-1"><MapPin class="size-3" />{{ fmtKm(r.totalDistanceKm) }}</span>
                <span class="flex items-center gap-1"><Clock class="size-3" />{{ fmtMin(r.totalDurationMin) }}</span>
                <span class="flex items-center gap-1"><Package class="size-3" />{{ r.stops.length }} stopów</span>
                <span class="flex items-center gap-1"><Weight class="size-3" />{{ Math.round(r.totalWeightKg) }} kg</span>
                <span class="ml-auto font-mono font-semibold">{{ fmtPLN(r.totalCostPLN) }}</span>
              </div>
            </li>
          </ul>
        </div>

        <!-- ==== TAB: route detail (stops) ==== -->
        <div v-else-if="tab === 'route' && selectedRoute" class="flex-1 overflow-y-auto">
          <div class="border-b border-border bg-muted/30 px-3 py-2 text-xs">
            <div class="font-semibold">{{ selectedRoute.driverName }}<span v-if="selectedRoute.helperName"> + {{ selectedRoute.helperName }}</span></div>
            <div class="text-muted-foreground">
              {{ planner.hubById.get(selectedRoute.hubId)?.name }} ·
              {{ selectedRoute.startAt }} → {{ selectedRoute.endAt }} ·
              {{ fmtKm(selectedRoute.totalDistanceKm) }} ·
              {{ fmtPLN(selectedRoute.totalCostPLN) }}
            </div>
          </div>
          <ol class="divide-y divide-border">
            <li
              v-for="stop in selectedRoute.stops"
              :key="stop.position"
              class="px-3 py-2 text-xs"
            >
              <div class="flex items-start gap-2">
                <span class="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {{ stop.position + 1 }}
                </span>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <span class="font-mono font-semibold">{{ orderById.get(stop.orderId)?.number ?? '—' }}</span>
                    <span class="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                      {{ planner.hubById.get(orderById.get(stop.orderId)?.hubId ?? 0)?.symbol }}
                    </span>
                    <span class="ml-auto inline-flex items-center gap-1 font-mono text-[11px]">
                      <Clock class="size-3 text-muted-foreground" />
                      {{ stop.arriveAt }}
                    </span>
                  </div>
                  <div class="text-[10px] text-muted-foreground">
                    + {{ stop.distanceFromPrevKm.toFixed(1) }} km od poprzedniego ({{ stop.drivingFromPrevMin }} min)
                  </div>
                  <div class="truncate text-muted-foreground">
                    {{ vendorName(orderById.get(stop.orderId)?.vendorId ?? 0) }} ·
                    {{ orderById.get(stop.orderId)?.customerName }}
                  </div>
                  <div class="truncate text-muted-foreground">
                    {{ orderById.get(stop.orderId)?.address.street }}, {{ orderById.get(stop.orderId)?.address.postalCode }} {{ orderById.get(stop.orderId)?.address.city }}
                  </div>

                  <div class="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
                    <span class="flex items-center gap-1">
                      <Weight class="size-3 text-muted-foreground" />
                      {{ orderById.get(stop.orderId)?.weightKg.toFixed(1) }} kg
                    </span>
                    <span class="flex items-center gap-1">
                      <Package class="size-3 text-muted-foreground" />
                      {{ orderById.get(stop.orderId)?.volumeM3.toFixed(2) }} m³
                    </span>
                    <span class="flex items-center gap-1 col-span-2">
                      <Clock class="size-3 text-muted-foreground" />
                      okno {{ orderById.get(stop.orderId)?.windowFrom }}–{{ orderById.get(stop.orderId)?.windowTo }}
                    </span>
                    <span v-if="(orderById.get(stop.orderId)?.services.length ?? 0) > 0" class="flex items-center gap-1 col-span-2">
                      <Wrench class="size-3 text-muted-foreground" />
                      {{ orderById.get(stop.orderId)!.services.length }} usług ·
                      {{ totalServiceMin(stop) }} min ·
                      <span class="truncate text-muted-foreground">
                        {{ orderById.get(stop.orderId)!.services.map(s => serviceName(s.serviceTypeId)).join(', ') }}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </li>
          </ol>
        </div>
      </div>
    </aside>
  </Transition>
</template>

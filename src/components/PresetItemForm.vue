<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { onClickOutside, onKeyStroke } from '@vueuse/core'
import { X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { CarFleetPresetItem } from '@/types/domain'

const props = defineProps<{ open: boolean; item: CarFleetPresetItem | null }>()
const emit = defineEmits<{
  close: []
  save: [data: Omit<CarFleetPresetItem, 'id' | 'presetId' | 'position'>]
}>()

const root = ref<HTMLDivElement | null>(null)

const form = reactive({
  carMaxCargoWeight: 1200,
  carMaxCargoVolume: 12,
  workingFrom: '07:00',
  workingTo: '17:00',
  quantity: 1,
  maxTaskCount: 17,
  monday: true,
  tuesday: true,
  wednesday: true,
  thursday: true,
  friday: true,
  saturday: false,
  sunday: false,
  routeEndsInCustomLocation: false,
  routeEndLat: '' as string,
  routeEndLon: '' as string,
  carSpeedFactor: 1.0,
  remarks: '',
  samsungBranded: false,
})

watch(
  () => [props.open, props.item] as const,
  ([open, it]) => {
    if (!open) return
    if (it) {
      form.carMaxCargoWeight = it.carMaxCargoWeight
      form.carMaxCargoVolume = it.carMaxCargoVolume
      form.workingFrom = it.workingFrom
      form.workingTo = it.workingTo
      form.quantity = it.quantity
      form.maxTaskCount = it.maxTaskCount
      form.monday = it.monday
      form.tuesday = it.tuesday
      form.wednesday = it.wednesday
      form.thursday = it.thursday
      form.friday = it.friday
      form.saturday = it.saturday
      form.sunday = it.sunday
      form.routeEndsInCustomLocation = it.routeEndsInCustomLocation
      form.routeEndLon = it.routeEndLocation ? String(it.routeEndLocation[0]) : ''
      form.routeEndLat = it.routeEndLocation ? String(it.routeEndLocation[1]) : ''
      form.carSpeedFactor = it.carSpeedFactor
      form.remarks = it.remarks
      form.samsungBranded = it.userTags.includes('SAMSUNG_BRANDED_DELIVERY')
    } else {
      form.carMaxCargoWeight = 1200
      form.carMaxCargoVolume = 12
      form.workingFrom = '07:00'
      form.workingTo = '17:00'
      form.quantity = 1
      form.maxTaskCount = 17
      form.monday = true
      form.tuesday = true
      form.wednesday = true
      form.thursday = true
      form.friday = true
      form.saturday = false
      form.sunday = false
      form.routeEndsInCustomLocation = false
      form.routeEndLat = ''
      form.routeEndLon = ''
      form.carSpeedFactor = 1.0
      form.remarks = ''
      form.samsungBranded = false
    }
  },
  { immediate: true },
)

onClickOutside(root, () => {
  if (props.open) emit('close')
})
onKeyStroke('Escape', () => {
  if (props.open) emit('close')
})

function submit() {
  const tags: string[] = []
  if (form.samsungBranded) tags.push('SAMSUNG_BRANDED_DELIVERY')
  let routeEnd: [number, number] | null = null
  if (form.routeEndsInCustomLocation && form.routeEndLat && form.routeEndLon) {
    const lat = parseFloat(form.routeEndLat)
    const lon = parseFloat(form.routeEndLon)
    if (Number.isFinite(lat) && Number.isFinite(lon)) routeEnd = [lon, lat]
  }
  emit('save', {
    carMaxCargoWeight: Number(form.carMaxCargoWeight) || 0,
    carMaxCargoVolume: Number(form.carMaxCargoVolume) || 0,
    workingFrom: form.workingFrom,
    workingTo: form.workingTo,
    quantity: Number(form.quantity) || 1,
    maxTaskCount: Number(form.maxTaskCount) || 0,
    suggestedCarId: null,
    employeeIds: [],
    monday: form.monday,
    tuesday: form.tuesday,
    wednesday: form.wednesday,
    thursday: form.thursday,
    friday: form.friday,
    saturday: form.saturday,
    sunday: form.sunday,
    routeEndsInCustomLocation: form.routeEndsInCustomLocation,
    routeEndLocation: routeEnd,
    carSpeedFactor: Number(form.carSpeedFactor) || 1,
    userTags: tags,
    remarks: form.remarks,
  })
}

const DAYS: { key: keyof typeof form; label: string }[] = [
  { key: 'monday', label: 'Pon' },
  { key: 'tuesday', label: 'Wt' },
  { key: 'wednesday', label: 'Śr' },
  { key: 'thursday', label: 'Czw' },
  { key: 'friday', label: 'Pt' },
  { key: 'saturday', label: 'Sob' },
  { key: 'sunday', label: 'Nd' },
]
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      leave-active-class="transition duration-100 ease-in"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div ref="root" class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-background p-4 shadow-2xl">
          <div class="mb-3 flex items-center justify-between">
            <h3 class="text-base font-semibold">{{ item ? 'Edytuj wpis floty' : 'Nowy wpis floty' }}</h3>
            <Button variant="ghost" size="icon" aria-label="Zamknij" @click="emit('close')">
              <X />
            </Button>
          </div>

          <div class="grid gap-3 md:grid-cols-2">
            <div>
              <label class="mb-1 block text-xs font-medium">Maks. waga ładunku [kg]</label>
              <input v-model.number="form.carMaxCargoWeight" type="number" min="0" max="100000"
                class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium">Maks. objętość [m³]</label>
              <input v-model.number="form.carMaxCargoVolume" type="number" min="0" max="100" step="0.1"
                class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>

            <div>
              <label class="mb-1 block text-xs font-medium">Praca od</label>
              <input v-model="form.workingFrom" type="time"
                class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium">Praca do</label>
              <input v-model="form.workingTo" type="time"
                class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>

            <div>
              <label class="mb-1 block text-xs font-medium">Liczba pojazdów (Quantity)</label>
              <input v-model.number="form.quantity" type="number" min="0" max="100"
                class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium">Maks. zadań na trasie</label>
              <input v-model.number="form.maxTaskCount" type="number" min="0" max="100"
                class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>

            <div class="md:col-span-2">
              <label class="mb-1 block text-xs font-medium">Dni tygodnia</label>
              <div class="flex flex-wrap gap-1.5">
                <label
                  v-for="d in DAYS"
                  :key="d.key"
                  :class="cn(
                    'inline-flex cursor-pointer items-center gap-1 rounded-md border border-input px-3 py-1 text-xs font-medium transition-colors',
                    form[d.key] ? 'bg-primary text-primary-foreground' : 'hover:bg-accent/50',
                  )"
                >
                  <input :checked="form[d.key] as boolean" type="checkbox" class="sr-only" @change="(form as any)[d.key] = ($event.target as HTMLInputElement).checked" />
                  {{ d.label }}
                </label>
              </div>
            </div>

            <div>
              <label class="mb-1 block text-xs font-medium">Mnożnik prędkości</label>
              <input v-model.number="form.carSpeedFactor" type="number" min="0.1" max="3" step="0.05"
                class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <p class="mt-1 text-[10px] text-muted-foreground">1.0 = standardowo. &lt;1 wolniejszy, &gt;1 szybszy.</p>
            </div>

            <div class="flex items-end">
              <label class="flex w-full cursor-pointer items-center gap-2 rounded-md border border-input p-2 text-xs">
                <input v-model="form.samsungBranded" type="checkbox" class="size-4" />
                Dostawy z marką <span class="font-semibold">Samsung</span>
              </label>
            </div>

            <div class="md:col-span-2">
              <label class="mb-1 block text-xs font-medium">Uwagi</label>
              <input v-model="form.remarks" type="text"
                class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>

            <div class="md:col-span-2 rounded-md border border-border p-3">
              <label class="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <input v-model="form.routeEndsInCustomLocation" type="checkbox" class="size-4" />
                Trasa kończy się w zdefiniowanej lokalizacji (np. garaż)
              </label>
              <div v-if="form.routeEndsInCustomLocation" class="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <label class="mb-1 block text-xs font-medium">Szerokość (lat)</label>
                  <input v-model="form.routeEndLat" type="text" placeholder="np. 50.04"
                    class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium">Długość (lon)</label>
                  <input v-model="form.routeEndLon" type="text" placeholder="np. 19.97"
                    class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
            </div>
          </div>

          <div class="mt-4 flex justify-end gap-2">
            <Button variant="outline" size="sm" @click="emit('close')">Anuluj</Button>
            <Button size="sm" @click="submit">{{ item ? 'Zapisz' : 'Utwórz' }}</Button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

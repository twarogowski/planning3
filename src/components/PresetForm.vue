<script setup lang="ts">
import { reactive, watch } from 'vue'
import { onClickOutside, onKeyStroke } from '@vueuse/core'
import { ref } from 'vue'
import { X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import DatePicker from '@/components/ui/DatePicker.vue'
import { hubs } from '@/data/hubs'
import type { CarFleetPreset } from '@/types/domain'

const props = defineProps<{ open: boolean; preset: CarFleetPreset | null }>()
const emit = defineEmits<{ close: []; save: [data: Omit<CarFleetPreset, 'id'>] }>()

const root = ref<HTMLDivElement | null>(null)

const form = reactive({
  name: '',
  hubId: hubs[0]!.id as number,
  isDefault: false,
  activeFrom: '',
  activeTo: '',
  remarks: '',
})
const errors = reactive({ name: false, hubId: false })

watch(
  () => [props.open, props.preset] as const,
  ([open, preset]) => {
    if (!open) return
    if (preset) {
      form.name = preset.name
      form.hubId = preset.hubId
      form.isDefault = preset.isDefault
      form.activeFrom = preset.activeFrom ?? ''
      form.activeTo = preset.activeTo ?? ''
      form.remarks = preset.remarks
    } else {
      form.name = ''
      form.hubId = hubs[0]!.id
      form.isDefault = false
      form.activeFrom = '2026-05-04'
      form.activeTo = '2026-12-31'
      form.remarks = ''
    }
    errors.name = false
    errors.hubId = false
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
  errors.name = !form.name.trim()
  errors.hubId = !form.hubId
  if (errors.name || errors.hubId) return
  emit('save', {
    name: form.name.trim(),
    hubId: form.hubId,
    isDefault: form.isDefault,
    activeFrom: form.activeFrom || null,
    activeTo: form.activeTo || null,
    remarks: form.remarks,
  })
}
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
        <div ref="root" class="w-full max-w-md rounded-lg border border-border bg-background p-4 shadow-2xl">
          <div class="mb-3 flex items-center justify-between">
            <h3 class="text-base font-semibold">{{ preset ? 'Edytuj preset' : 'Nowy preset' }}</h3>
            <Button variant="ghost" size="icon" aria-label="Zamknij" @click="emit('close')">
              <X />
            </Button>
          </div>

          <div class="grid gap-3">
            <div>
              <label class="mb-1 block text-xs font-medium">Nazwa</label>
              <input
                v-model="form.name"
                type="text"
                placeholder="np. WAW · standard codzienny"
                :class="['w-full rounded-md border bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring', errors.name ? 'border-destructive' : 'border-input']"
              />
            </div>

            <div>
              <label class="mb-1 block text-xs font-medium">Centrum logistyczne</label>
              <select
                v-model="form.hubId"
                :class="['w-full rounded-md border bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring', errors.hubId ? 'border-destructive' : 'border-input']"
              >
                <option v-for="h in hubs" :key="h.id" :value="h.id">{{ h.symbol }} — {{ h.name }}</option>
              </select>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="mb-1 block text-xs font-medium">Aktywny od</label>
                <DatePicker v-model="form.activeFrom" />
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium">Aktywny do</label>
                <DatePicker v-model="form.activeTo" />
              </div>
            </div>

            <div>
              <label class="mb-1 block text-xs font-medium">Uwagi</label>
              <textarea
                v-model="form.remarks"
                rows="2"
                class="w-full resize-y rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <label class="flex items-center gap-2 text-sm">
              <input v-model="form.isDefault" type="checkbox" class="size-4" />
              Ustaw jako domyślny dla tego oddziału
            </label>
          </div>

          <div class="mt-4 flex justify-end gap-2">
            <Button variant="outline" size="sm" @click="emit('close')">Anuluj</Button>
            <Button size="sm" @click="submit">{{ preset ? 'Zapisz' : 'Utwórz' }}</Button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

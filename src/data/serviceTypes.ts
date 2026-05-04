import type { ServiceType } from '@/types/domain'

// Najczęstsze typy usług dodatkowych z `Tms.ServiceType` w prod-bazie DtsTms.
// `defaultDurationMin` na podstawie typowych czasów montaży / instalacji.
export const serviceTypes: ServiceType[] = [
  { id: 3, name: 'Montaż mebli', defaultDurationMin: 60 },
  { id: 68, name: 'Instalacja TV', defaultDurationMin: 30 },
  { id: 70, name: 'Montaż TV na ścianie', defaultDurationMin: 45 },
  { id: 64, name: 'Instalacja AGD (gaz)', defaultDurationMin: 40 },
  { id: 65, name: 'Instalacja AGD (woda)', defaultDurationMin: 30 },
  { id: 76, name: 'Pralka/Zmywarka do zabudowy', defaultDurationMin: 50 },
  { id: 81, name: 'Pralka do zabudowy', defaultDurationMin: 45 },
  { id: 85, name: 'Piekarnik pod zabudowę', defaultDurationMin: 45 },
  { id: 61, name: 'Rozpakowanie towarów', defaultDurationMin: 15 },
  { id: 74, name: 'Odbiór starego sprzętu', defaultDurationMin: 10 },
  { id: 73, name: 'Pakiet złoty', defaultDurationMin: 90 },
  { id: 72, name: 'Pakiet srebrny', defaultDurationMin: 60 },
]

export const serviceTypeById = new Map(serviceTypes.map((s) => [s.id, s]))

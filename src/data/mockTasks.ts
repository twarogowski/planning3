export interface TransportTask {
  id: string
  reference: string
  customer: string
  cargo: string
  weightKg: number
  origin: { name: string; lonLat: [number, number] }
  destination: { name: string; lonLat: [number, number] }
  pickupAt: string
  deliveryAt: string
  status: 'new' | 'planning' | 'planned'
}

export const mockTasks: TransportTask[] = [
  {
    id: 't-1001',
    reference: 'ZL/2026/05/0142',
    customer: 'Polmech Sp. z o.o.',
    cargo: 'Maszyny CNC, 4 palety',
    weightKg: 3200,
    origin: { name: 'Warszawa, Annopol', lonLat: [21.0322, 52.2965] },
    destination: { name: 'Wrocław, Bielany', lonLat: [16.9899, 51.0648] },
    pickupAt: '2026-05-04 08:00',
    deliveryAt: '2026-05-05 14:00',
    status: 'new',
  },
  {
    id: 't-1002',
    reference: 'ZL/2026/05/0143',
    customer: 'BaltAgro',
    cargo: 'Nawóz workowany, 22 t',
    weightKg: 22000,
    origin: { name: 'Gdańsk, Port Północny', lonLat: [18.715, 54.395] },
    destination: { name: 'Lublin, Felin', lonLat: [22.625, 51.225] },
    pickupAt: '2026-05-03 06:00',
    deliveryAt: '2026-05-04 10:00',
    status: 'planning',
  },
  {
    id: 't-1003',
    reference: 'ZL/2026/05/0144',
    customer: 'Carrefour Polska',
    cargo: 'FMCG mrożone, 33 palety',
    weightKg: 18500,
    origin: { name: 'Poznań, Antoninek', lonLat: [16.9988, 52.4146] },
    destination: { name: 'Kraków, Płaszów', lonLat: [19.9685, 50.0379] },
    pickupAt: '2026-05-04 22:00',
    deliveryAt: '2026-05-05 06:00',
    status: 'new',
  },
  {
    id: 't-1004',
    reference: 'ZL/2026/05/0145',
    customer: 'Stalprodukt',
    cargo: 'Kręgi blachy, 24 t',
    weightKg: 24000,
    origin: { name: 'Katowice, Wełnowiec', lonLat: [19.0145, 50.2832] },
    destination: { name: 'Szczecin, Port', lonLat: [14.5635, 53.421] },
    pickupAt: '2026-05-05 05:30',
    deliveryAt: '2026-05-06 12:00',
    status: 'planned',
  },
  {
    id: 't-1005',
    reference: 'ZL/2026/05/0146',
    customer: 'IKEA Industry',
    cargo: 'Meble paczkowane, 31 palet',
    weightKg: 9800,
    origin: { name: 'Lubawa', lonLat: [19.749, 53.503] },
    destination: { name: 'Rzeszów, Załęże', lonLat: [22.005, 50.041] },
    pickupAt: '2026-05-04 14:00',
    deliveryAt: '2026-05-05 18:00',
    status: 'new',
  },
  {
    id: 't-1006',
    reference: 'ZL/2026/05/0147',
    customer: 'Volkswagen Poznań',
    cargo: 'Komponenty samochodowe',
    weightKg: 6400,
    origin: { name: 'Poznań, Antoninek', lonLat: [16.9988, 52.4146] },
    destination: { name: 'Białystok, Hryniewicze', lonLat: [23.131, 53.094] },
    pickupAt: '2026-05-06 07:00',
    deliveryAt: '2026-05-06 22:00',
    status: 'planning',
  },
]

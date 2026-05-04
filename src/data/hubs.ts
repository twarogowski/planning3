import type { Hub } from '@/types/domain'

// Top 15 aktywnych hubów z prod-bazy DtsTms (90 dni, 2026-05).
// `vehicleCount` skalowany do liczby zleceń: dolny pułap 5 (małe), górny 25 (duże).
export const hubs: Hub[] = [
  { id: 1, symbol: 'WAW', name: 'Warszawa', city: 'Sękocin-Stary', lonLat: [20.8857, 52.1156], size: 'L', vehicleCount: 25 },
  { id: 3, symbol: 'LDZ', name: 'Łódź', city: 'Łódź', lonLat: [19.5805, 51.7418], size: 'L', vehicleCount: 22 },
  { id: 2, symbol: 'KAT', name: 'Katowice', city: 'Sosnowiec', lonLat: [19.0985, 50.2886], size: 'L', vehicleCount: 22 },
  { id: 13, symbol: 'WRO', name: 'Wrocław', city: 'Wrocław', lonLat: [16.9242, 51.0990], size: 'L', vehicleCount: 20 },
  { id: 4, symbol: 'POZ', name: 'Poznań', city: 'Plewiska', lonLat: [16.8250, 52.3567], size: 'L', vehicleCount: 18 },
  { id: 10, symbol: 'LBL', name: 'Lublin', city: 'Lublin', lonLat: [22.5676, 51.2763], size: 'M', vehicleCount: 16 },
  { id: 11, symbol: 'KRA', name: 'Kraków', city: 'Wieliczka', lonLat: [20.0385, 49.9823], size: 'M', vehicleCount: 16 },
  { id: 7, symbol: 'GDA', name: 'Gdańsk', city: 'Jankowo Gdańskie', lonLat: [18.5691, 54.2976], size: 'M', vehicleCount: 14 },
  { id: 16, symbol: 'RZE', name: 'Rzeszów', city: 'Jasionka', lonLat: [22.0275, 50.1244], size: 'M', vehicleCount: 12 },
  { id: 8, symbol: 'BYD', name: 'Bydgoszcz', city: 'Bydgoszcz', lonLat: [18.0732, 53.1067], size: 'M', vehicleCount: 12 },
  { id: 5, symbol: 'SZC', name: 'Szczecin', city: 'Szczecin', lonLat: [14.6789, 53.3830], size: 'S', vehicleCount: 9 },
  { id: 34, symbol: 'MMZ', name: 'Mińsk Mazowiecki', city: 'Stojadła', lonLat: [21.5256, 52.1888], size: 'S', vehicleCount: 8 },
  { id: 9, symbol: 'BST', name: 'Białystok', city: 'Choroszcz', lonLat: [23.0163, 53.1570], size: 'S', vehicleCount: 8 },
  { id: 33, symbol: 'LOH', name: 'Löhne (DE)', city: 'Löhne', lonLat: [8.7325, 52.1959], size: 'S', vehicleCount: 7 },
  { id: 14, symbol: 'OLS', name: 'Olsztyn', city: 'Warkały', lonLat: [20.3441, 53.8050], size: 'S', vehicleCount: 6 },
]

export const hubById = new Map(hubs.map((h) => [h.id, h]))

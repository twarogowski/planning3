# Planning3

Makieta aplikacji webowej do planowania zleceń transportowych na mapie.

## Stack

- **Bun.js** — runtime i package manager
- **Vue 3** + **Vite 6** + **TypeScript**
- **OpenLayers** + **ol-mapbox-style** — mapa wektorowa (vector tiles z [OpenFreeMap](https://openfreemap.org/), styl _positron_) + warstwy wektorowe dla tras i punktów
- **Tailwind CSS v4** + komponenty w stylu **shadcn-vue** (reka-ui jako primitives)

Frontend-only, brak backendu. Dane zleceń pochodzą z `src/data/mockTasks.ts`.

## Funkcje (mockup)

- Mapa zajmująca 100% ekranu (wektorowe tile'y z OpenFreeMap, wektorowe trasy/punkty OL na wierzchu).
- Przycisk **„Zlecenia do zaplanowania"** w prawym górnym rogu otwiera lewy overlay panel.
- Filtrowanie zleceń wg statusu: Nowe / W planowaniu / Zaplanowane.
- Hover na zleceniu w panelu podświetla trasę na mapie.
- Legenda statusów w prawym dolnym rogu.

## Uruchomienie

```bash
bun install
bun run dev      # http://localhost:5173
bun run build    # produkcyjny build do dist/
bun run preview  # podgląd buildu
```

## Struktura

```
src/
  App.vue                       # layout: mapa + przycisk + panel + legenda
  components/
    Map.vue                     # OpenLayers — OSM + warstwy wektorowe
    TasksPanel.vue              # overlay panel ze zleceniami
    ui/button/                  # przycisk w stylu shadcn (cva + reka-ui)
  data/mockTasks.ts             # przykładowe zlecenia transportowe
  lib/utils.ts                  # cn() — clsx + tailwind-merge
  styles/main.css               # Tailwind v4 + zmienne motywu shadcn
```

## Dalsze kroki

- Drag & drop zleceń na pojazdy / kierowców.
- Optymalizacja kolejności przejazdów (VRP).
- Backend + auth.
- Drag & drop zleceń pomiędzy panelem a mapą.

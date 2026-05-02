# Planning3

Makieta aplikacji webowej do planowania zleceń transportowych na mapie.

## Stack

- **Bun.js** — runtime i package manager
- **Vue 3** + **Vite 6** + **TypeScript**
- **OpenLayers** + **ol-mapbox-style** — mapa wektorowa (vector tiles z [OpenFreeMap](https://openfreemap.org/), styl _dark_) + warstwy wektorowe dla tras i punktów
- **Tailwind CSS v4** + komponenty w stylu **shadcn-vue** (reka-ui jako primitives)
- **MediaPipe Tasks Vision** — `GestureRecognizer` (sterowanie mapą gestami dłoni z kamery)

Frontend-only, brak backendu. Dane zleceń pochodzą z `src/data/mockTasks.ts`.

## Funkcje

- Mapa wektorowa zajmująca 100% ekranu (OpenFreeMap dark + warstwy wektorowe OL na wierzchu).
- Przycisk **„Zlecenia do zaplanowania"** w prawym górnym rogu otwiera lewy overlay panel.
- Filtrowanie zleceń wg statusu: Nowe / W planowaniu / Zaplanowane.
- Hover na zleceniu w panelu podświetla trasę na mapie.
- Sterowanie mapą myszą, klawiaturą i gestami dłoni (kamera).

## Sterowanie mapą

### Mysz / touchpad

- LPM + przeciąganie — przesuwanie mapy
- scroll — zoom
- `Shift` + LPM + przeciąganie — obrót

### Klawiatura

Skróty działają, gdy mapa ma fokus (kliknij w mapę, jeśli przestaną reagować).

| Klawisze | Akcja |
|---|---|
| `↑` `↓` `←` `→` | Przesuwanie mapy (`KeyboardPan` z OL) |
| `+` `−` | Powiększenie / pomniejszenie (`KeyboardZoom` z OL) |
| `Q` / `E` | Obrót co 15° w lewo / prawo |
| `R` | Reset obrotu (północ do góry) |
| `G` | Włącz / wyłącz sterowanie gestami (globalnie, ignorowane w polach formularzy) |

### Gesty (single-hand, MediaPipe)

Włącz przyciskiem ✋ w prawym górnym rogu lub klawiszem `G`. Pierwsze uruchomienie pyta o zgodę na kamerę. Wymaga HTTPS lub `localhost`.

| Gest | Tryb | Akcja |
|---|---|---|
| **Zaciśnięta pięść** | `pan` | Pozycja środka dłoni → przesuwanie mapy. Obrót nadgarstka (oś nadgarstek → MCP środkowego palca) → obrót mapy. |
| **Otwarta dłoń** | `zoom` | Ruch w górę → zoom in (`exp(-dy · sens)`); w dół → zoom out. |
| inne / brak ręki | `idle` | reset stanu |

Czułości i deadzony są w stałych na górze `src/composables/useGestureControl.ts` (`PAN_SENSITIVITY`, `FIST_ROTATE_DEAD_ZONE`, `PALM_ZOOM_SENSITIVITY`, `PALM_ZOOM_DEAD_ZONE`).

Podgląd kamery jest domyślnie ukryty — element `<video>` jest renderowany off-screen, MediaPipe i tak czyta z niego klatki.

## Uruchomienie

```bash
bun install
bun run dev      # http://localhost:5173
bun run build    # produkcyjny build do dist/
bun run preview  # podgląd buildu
```

`bun run dev` i `bun run build` najpierw wołają skrypt `prepare:wasm`, który kopiuje pliki WASM MediaPipe z `node_modules/@mediapipe/tasks-vision/wasm` do `public/mediapipe-wasm/`. Vite serwuje je lokalnie z poprawnym MIME — dzięki temu unikamy problemów z CORS / `nosniff` / niespójnymi wersjami z CDN.

## Struktura

```
src/
  App.vue                            # layout: mapa + toggle gestów + przycisk panelu + panel
  components/
    Map.vue                          # OpenLayers + ol-mapbox-style; expose pan/zoom/rotate/reset
    TasksPanel.vue                   # overlay panel ze zleceniami
    GestureCamera.vue                # mały toggle ✋, ukryte video/canvas, globalny skrót G
    ui/button/                       # przycisk w stylu shadcn (cva + reka-ui)
  composables/
    useGestureControl.ts             # MediaPipe GestureRecognizer + maszyna stanów gestów
  data/mockTasks.ts                  # przykładowe zlecenia transportowe
  lib/utils.ts                       # cn() — clsx + tailwind-merge
  styles/main.css                    # Tailwind v4 + zmienne motywu shadcn
public/
  mediapipe-wasm/                    # generowane przez `bun run prepare:wasm`, gitignored
```

## Dalsze kroki

- Drag & drop zleceń pomiędzy panelem a mapą / między pojazdami.
- Optymalizacja kolejności przejazdów (VRP).
- Backend + auth.
- Pamiętanie ostatnich ustawień widoku mapy (localStorage).
- Eksport zaplanowanych tras (np. GeoJSON / GPX).

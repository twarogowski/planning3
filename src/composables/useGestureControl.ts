import { ref, onUnmounted, type Ref } from 'vue'
import {
  FilesetResolver,
  GestureRecognizer,
  DrawingUtils,
  type GestureRecognizerResult,
} from '@mediapipe/tasks-vision'

export type GestureMode = 'idle' | 'pan' | 'zoom'

export interface GestureControlEvents {
  onPan?: (dxPx: number, dyPx: number) => void
  onZoom?: (factor: number) => void
  onRotate?: (deltaRad: number) => void
  onModeChange?: (mode: GestureMode) => void
}

// WASM kopiowane z node_modules do public/ przez skrypt `prepare:wasm` (patrz package.json),
// dzięki czemu unikamy problemów z CORS / MIME / cache CDN.
const WASM_BASE = '/mediapipe-wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task'

const PAN_SENSITIVITY = 800
// Większy deadzone dla obrotu pięścią — naturalne drgania podczas pan nie powinny obracać mapy.
const FIST_ROTATE_DEAD_ZONE = 0.025
// Czułość zoomu otwartą dłonią: ruch pełnej wysokości kadru ≈ exp(0.5 * SENS) ≈ 4.5x dla SENS=3.
const PALM_ZOOM_SENSITIVITY = 3.0
const PALM_ZOOM_DEAD_ZONE = 0.003
// Ile klatek z rzędu musi być "nie nasz gest", żeby wyjść z aktywnego trybu (tłumi jitter klasyfikatora).
const IDLE_GRACE_FRAMES = 4

interface Vec {
  x: number
  y: number
}

type Landmark = { x: number; y: number }

function palmCenter(landmarks: Landmark[]): Vec {
  // landmark 9 = base of middle finger (good palm-center proxy)
  const lm = landmarks[9]
  return { x: 1 - lm.x, y: lm.y } // mirror x to match selfie-view
}

function fistAngle(landmarks: Landmark[]): number {
  // wektor nadgarstek (0) → MCP środkowego palca (9) — oś przez całą dłoń.
  const w = landmarks[0]
  const m = landmarks[9]
  const wx = 1 - w.x
  const mx = 1 - m.x
  return Math.atan2(m.y - w.y, mx - wx)
}

export function useGestureControl(events: GestureControlEvents) {
  const isActive = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const mode = ref<GestureMode>('idle')
  const detectedGesture = ref<string>('—')
  const videoRef: Ref<HTMLVideoElement | null> = ref(null)
  const canvasRef: Ref<HTMLCanvasElement | null> = ref(null)

  let recognizer: GestureRecognizer | null = null
  let stream: MediaStream | null = null
  let rafId = 0
  let lastPanPos: Vec | null = null
  let lastFistAngle: number | null = null
  let lastZoomY: number | null = null
  let idleFrames = 0
  let drawingUtils: DrawingUtils | null = null

  function setMode(next: GestureMode) {
    if (mode.value === next) return
    mode.value = next
    lastPanPos = null
    lastFistAngle = null
    lastZoomY = null
    idleFrames = 0
    events.onModeChange?.(next)
  }

  function maybeIdle() {
    // Sklasyfikatory MediaPipe potrafią migać („None" dla 1-2 klatek).
    // Wpadamy w idle dopiero po IDLE_GRACE_FRAMES kolejnych klatek bez naszego gestu.
    idleFrames++
    if (idleFrames >= IDLE_GRACE_FRAMES) setMode('idle')
  }

  function processResult(result: GestureRecognizerResult) {
    const hands = result.landmarks
    const gestures = result.gestures

    if (hands.length === 0) {
      detectedGesture.value = '—'
      maybeIdle()
      return
    }

    // Single-hand-only sterowanie. Drugą rękę ignorujemy (ujmujemy tylko hands[0]).
    const cat = gestures[0]?.[0]?.categoryName ?? 'None'
    detectedGesture.value = cat

    if (cat === 'Closed_Fist') {
      idleFrames = 0
      const center = palmCenter(hands[0])
      const angle = fistAngle(hands[0])
      if (mode.value !== 'pan') {
        setMode('pan')
        lastPanPos = center
        lastFistAngle = angle
        return
      }
      if (lastPanPos) {
        const dx = (center.x - lastPanPos.x) * PAN_SENSITIVITY
        const dy = (center.y - lastPanPos.y) * PAN_SENSITIVITY
        if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) events.onPan?.(dx, dy)
      }
      if (lastFistAngle !== null) {
        let dAngle = angle - lastFistAngle
        if (dAngle > Math.PI) dAngle -= 2 * Math.PI
        if (dAngle < -Math.PI) dAngle += 2 * Math.PI
        if (Math.abs(dAngle) > FIST_ROTATE_DEAD_ZONE) events.onRotate?.(dAngle)
      }
      lastPanPos = center
      lastFistAngle = angle
      return
    }

    if (cat === 'Open_Palm') {
      idleFrames = 0
      const center = palmCenter(hands[0])
      if (mode.value !== 'zoom') {
        setMode('zoom')
        lastZoomY = center.y
        return
      }
      if (lastZoomY !== null) {
        const dy = center.y - lastZoomY // dodatnie = ręka w dół
        if (Math.abs(dy) > PALM_ZOOM_DEAD_ZONE) {
          // ręka w górę (dy<0) → factor>1 → zoom in
          const factor = Math.exp(-dy * PALM_ZOOM_SENSITIVITY)
          events.onZoom?.(factor)
        }
      }
      lastZoomY = center.y
      return
    }

    maybeIdle()
  }

  function drawOverlay(result: GestureRecognizerResult) {
    const canvas = canvasRef.value
    const video = videoRef.value
    if (!canvas || !video || !drawingUtils) return

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth || 320
      canvas.height = video.videoHeight || 240
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.save()
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    for (const lms of result.landmarks) {
      drawingUtils.drawConnectors(lms, GestureRecognizer.HAND_CONNECTIONS, {
        color: '#ffffff',
        lineWidth: 2,
      })
      drawingUtils.drawLandmarks(lms, { color: '#22d3ee', lineWidth: 1, radius: 3 })
    }
    ctx.restore()
  }

  function loop() {
    if (!isActive.value || !recognizer) return
    const video = videoRef.value
    if (video && video.readyState >= 2) {
      const result = recognizer.recognizeForVideo(video, performance.now())
      processResult(result)
      drawOverlay(result)
    }
    rafId = requestAnimationFrame(loop)
  }

  async function start() {
    if (isActive.value || isLoading.value) return
    isLoading.value = true
    error.value = null
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
        audio: false,
      })
      const video = videoRef.value
      if (!video) throw new Error('Element wideo nie jest gotowy')
      video.srcObject = stream
      await video.play()

      const vision = await FilesetResolver.forVisionTasks(WASM_BASE)
      try {
        recognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
          numHands: 1,
          runningMode: 'VIDEO',
        })
      } catch (gpuErr) {
        console.warn('Inicjalizacja GPU nie powiodła się, próbuję CPU', gpuErr)
        recognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
          numHands: 1,
          runningMode: 'VIDEO',
        })
      }

      const canvas = canvasRef.value
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) drawingUtils = new DrawingUtils(ctx)
      }

      isActive.value = true
      loop()
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      await stop()
    } finally {
      isLoading.value = false
    }
  }

  async function stop() {
    isActive.value = false
    cancelAnimationFrame(rafId)
    if (stream) {
      stream.getTracks().forEach((t) => t.stop())
      stream = null
    }
    if (recognizer) {
      recognizer.close()
      recognizer = null
    }
    if (videoRef.value) videoRef.value.srcObject = null
    drawingUtils = null
    setMode('idle')
    detectedGesture.value = '—'
  }

  onUnmounted(() => {
    void stop()
  })

  return {
    isActive,
    isLoading,
    error,
    mode,
    detectedGesture,
    videoRef,
    canvasRef,
    start,
    stop,
  }
}

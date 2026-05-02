import { ref, onUnmounted, type Ref } from 'vue'
import {
  FilesetResolver,
  GestureRecognizer,
  DrawingUtils,
  type GestureRecognizerResult,
} from '@mediapipe/tasks-vision'

export type GestureMode = 'idle' | 'pan' | 'transform'

export interface GestureControlEvents {
  onPan?: (dxPx: number, dyPx: number) => void
  onZoom?: (factor: number) => void
  onRotate?: (deltaRad: number) => void
  onModeChange?: (mode: GestureMode) => void
}

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task'

const PAN_SENSITIVITY = 800
const ZOOM_DEAD_ZONE = 0.005
const ROTATE_DEAD_ZONE = 0.008

interface Vec {
  x: number
  y: number
}

function palmCenter(landmarks: { x: number; y: number }[]): Vec {
  // landmark 9 = base of middle finger (good palm-center proxy)
  const lm = landmarks[9]
  return { x: 1 - lm.x, y: lm.y } // mirror x to match selfie-view
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
  let lastTransform: { dist: number; angle: number } | null = null
  let drawingUtils: DrawingUtils | null = null

  function setMode(next: GestureMode) {
    if (mode.value === next) return
    mode.value = next
    lastPanPos = null
    lastTransform = null
    events.onModeChange?.(next)
  }

  function processResult(result: GestureRecognizerResult) {
    const hands = result.landmarks
    const gestures = result.gestures

    if (hands.length === 0) {
      detectedGesture.value = '—'
      setMode('idle')
      return
    }

    if (hands.length === 1) {
      const cat = gestures[0]?.[0]?.categoryName ?? 'None'
      detectedGesture.value = cat
      if (cat === 'Closed_Fist') {
        const center = palmCenter(hands[0])
        if (mode.value !== 'pan') {
          setMode('pan')
          lastPanPos = center
        } else if (lastPanPos) {
          const dx = (center.x - lastPanPos.x) * PAN_SENSITIVITY
          const dy = (center.y - lastPanPos.y) * PAN_SENSITIVITY
          lastPanPos = center
          if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) events.onPan?.(dx, dy)
        }
      } else {
        setMode('idle')
      }
      return
    }

    // two hands
    detectedGesture.value = `${gestures[0]?.[0]?.categoryName ?? '?'} + ${gestures[1]?.[0]?.categoryName ?? '?'}`
    const c1 = palmCenter(hands[0])
    const c2 = palmCenter(hands[1])
    const dx = c2.x - c1.x
    const dy = c2.y - c1.y
    const dist = Math.hypot(dx, dy)
    const angle = Math.atan2(dy, dx)

    if (mode.value !== 'transform') {
      setMode('transform')
      lastTransform = { dist, angle }
      return
    }
    if (!lastTransform) {
      lastTransform = { dist, angle }
      return
    }

    const factor = lastTransform.dist > 0 ? dist / lastTransform.dist : 1
    let dAngle = angle - lastTransform.angle
    if (dAngle > Math.PI) dAngle -= 2 * Math.PI
    if (dAngle < -Math.PI) dAngle += 2 * Math.PI

    if (Math.abs(factor - 1) > ZOOM_DEAD_ZONE) events.onZoom?.(factor)
    if (Math.abs(dAngle) > ROTATE_DEAD_ZONE) events.onRotate?.(dAngle)

    lastTransform = { dist, angle }
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
      recognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        numHands: 2,
        runningMode: 'VIDEO',
      })

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

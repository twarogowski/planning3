import { ref, watch } from 'vue'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'planning3-theme'

function readInitial(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    /* ignore */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyClass(t: Theme) {
  document.documentElement.classList.toggle('dark', t === 'dark')
}

const theme = ref<Theme>(readInitial())
applyClass(theme.value)

watch(theme, (t) => {
  applyClass(t)
  try {
    localStorage.setItem(STORAGE_KEY, t)
  } catch {
    /* ignore */
  }
})

export function useTheme() {
  function toggle() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }
  function setTheme(t: Theme) {
    theme.value = t
  }
  return { theme, toggle, setTheme }
}

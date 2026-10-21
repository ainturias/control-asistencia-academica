import { useSyncExternalStore } from 'react'

/** "system" sigue al sistema operativo; "light" y "dark" fijan el tema. */
export type ThemePreference = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'theme'
const media = window.matchMedia('(prefers-color-scheme: dark)')
const listeners = new Set<() => void>()

function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system'
  }
}

let preference = readPreference()

const resolve = (pref: ThemePreference) => (pref === 'system' ? (media.matches ? 'dark' : 'light') : pref)

/** El atributo también lo fija un script en index.html antes de pintar, para evitar un destello claro. */
function apply() {
  document.documentElement.dataset.theme = resolve(preference)
  listeners.forEach((listener) => listener())
}

media.addEventListener('change', () => {
  if (preference === 'system') apply()
})

export function setThemePreference(next: ThemePreference) {
  preference = next
  try {
    if (next === 'system') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // Sin almacenamiento el tema vale solo para esta visita.
  }
  apply()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useTheme() {
  const pref = useSyncExternalStore(subscribe, () => preference)
  const resolved = useSyncExternalStore(subscribe, () => resolve(preference))
  return { preference: pref, resolved, setPreference: setThemePreference }
}

apply()

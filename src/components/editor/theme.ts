export type Theme = 'light' | 'dark'

export function getTheme(): Theme {
  const stored = localStorage.getItem('theme') as Theme | null
  if (stored) return stored

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  localStorage.setItem('theme', theme)
}

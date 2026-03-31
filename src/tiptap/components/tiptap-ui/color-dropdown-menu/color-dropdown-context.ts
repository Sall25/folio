import { createContext } from "react"

export type RecentColor = {
  color: string
  label: string
  type: 'text' | 'highlight'
}

interface ColorDropdownContextType {
  recentColors: RecentColor[]
  addRecentColor: (recent: RecentColor) => void
  mode: 'node' | 'mark'
}

export const ColorDropdownContext = createContext<ColorDropdownContextType>({
  recentColors: [],
  addRecentColor: () => { },
  mode: 'node'
})
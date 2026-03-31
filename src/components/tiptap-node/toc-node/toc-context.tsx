import { createContext } from "react"

export interface TocItem {
  id: string
  level: number
  textContent: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  node?: any
}

interface TocContextValue {
  tocContent: TocItem[]
  setTocContent: (items: TocItem[]) => void
  activeId: string | null
  setActiveId: (id: string | null) => void
  navigateToHeading: (item: TocItem, topOffset?: number) => void
  normalizeDepths: (items: TocItem[]) => number[]
  open: boolean
  showTocContent: () => void
  hideTocContent: () => void
}

export const TocContext = createContext<TocContextValue | null>(null)

import type { Editor } from "@tiptap/core"
import type { LucideIcon } from "lucide-react"

export interface BlockTypeOption {
  type: string // The node type name
  label: string // Display label
  level?: number // For headings (1, 2, 3)
  isActive: (editor: Editor) => boolean // Function to check if active
  icon?: LucideIcon
}

export interface ShouldShowTurnIntoParams {
  editor: Editor | null
  hideWhenUnavailable?: boolean
  blockTypes?: string[]
  options?: BlockTypeOption[]
}

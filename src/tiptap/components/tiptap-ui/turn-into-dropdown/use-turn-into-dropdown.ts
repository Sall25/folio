import { useState, useMemo, useCallback, useEffect } from "react"
import type { Editor } from "@tiptap/core"
import type { BlockTypeOption } from "./types"
import { Repeat2, type LucideIcon } from "lucide-react"
import {
  getFilteredBlockTypeOptions,
  canTurnInto,
} from "./utils"


export function useVisible(editor: Editor | null, filteredOptions: BlockTypeOption[], hideWhenUnavailable: boolean) {
  const [isVisible, setIsVisible] = useState(() => {
    if (!editor) return false
    if (!filteredOptions.length) return false
    return !hideWhenUnavailable || canTurnInto(editor, filteredOptions.map(o => o.type))
  })

  useEffect(() => {
    if (!editor) return

    const update = () => {
      if (!editor) {
        setIsVisible(false)
        return
      }

      if (!filteredOptions.length) {
        setIsVisible(false)
        return
      }

      const visible = canTurnInto(editor, filteredOptions.map(o => o.type))
      setIsVisible(visible)
    }

    // Initial check
    update()

    // Subscribe to transactions
    editor.on('transaction', update)

    return () => {
      editor.off('transaction', update)
    }
  }, [editor, filteredOptions, hideWhenUnavailable])

  return isVisible
}

export function useActiveBlockType(editor: Editor | null, filteredOptions: BlockTypeOption[]) {
  const [activeBlockType, setActiveBlockType] = useState<BlockTypeOption | undefined>(() => {
    if (!editor) return undefined
    return filteredOptions.find(option => option.isActive(editor))
  })

  useEffect(() => {
    if (!editor) return

    const update = () => {
      const current = filteredOptions.find(option => option.isActive(editor))
      setActiveBlockType(current)
    }

    // Run once initially
    update()

    // Subscribe to editor updates (transaction, selection, etc.)
    editor.on('transaction', update)

    // Cleanup subscription on unmount
    return () => {
      editor.off('transaction', update)
    }
  }, [editor, filteredOptions])

  return activeBlockType
}


interface UseTurnIntoDropdownProps {
  editor: Editor | null
  hideWhenUnavailable?: boolean
  blockTypes?: string[]
  onOpenChange?: (isOpen: boolean) => void
}

interface UseTurnIntoDropdownReturn {
  isVisible: boolean
  canToggle: boolean
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  activeBlockType?: BlockTypeOption
  handleOpenChange: (open: boolean) => void
  filteredOptions: BlockTypeOption[]
  label: string
  Icon: LucideIcon
}

export function useTurnIntoDropdown({
  editor,
  hideWhenUnavailable = false,
  blockTypes,
  onOpenChange,
}: UseTurnIntoDropdownProps): UseTurnIntoDropdownReturn {
  const [isOpen, setIsOpen] = useState(false)

  const filteredOptions = useMemo(
    () => getFilteredBlockTypeOptions(blockTypes),
    [blockTypes],
  )

  const canToggle = useMemo(
    () => canTurnInto(editor, blockTypes),
    [editor, blockTypes],
  )

  const isVisible = useVisible(editor, filteredOptions, hideWhenUnavailable)

  const activeBlockType = useActiveBlockType(editor, filteredOptions)

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open)
      onOpenChange?.(open)
    },
    [onOpenChange],
  )

  const label = activeBlockType
    ? `Turn into ${activeBlockType.label}`
    : 'Turn into'

  return {
    isVisible,
    canToggle,
    isOpen,
    setIsOpen,
    activeBlockType,
    handleOpenChange,
    filteredOptions,
    label,
    Icon: Repeat2,
  }
}
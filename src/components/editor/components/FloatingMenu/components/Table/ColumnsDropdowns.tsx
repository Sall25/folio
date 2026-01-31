import { useEffect, useMemo, useState } from 'react'
import { Editor } from '@tiptap/react'
import { ColumnDropdown } from './ColumnDropdown'

interface ColumnDropdownsProps {
  editor: Editor
}

export function ColumnDropdowns({ editor }: ColumnDropdownsProps) {
  const [active, setActive] = useState(false)
  const [hoveredCol, setHoveredCol] = useState<number | null>(null)
  // const [cells, setCells] = useState<HTMLTableCellElement[]>([])

  // // Track table active state
  useEffect(() => {
    const update = () => setActive(editor.isActive('table'))
    editor.on('selectionUpdate', update)
    editor.on('transaction', update)
    return () => {
      editor.off('selectionUpdate', update)
      editor.off('transaction', update)
    }
  }, [editor])

  const cells = useMemo(() => {
    if (!editor) return []

    const tables = editor.$nodes('table')
    
    
    const result: HTMLTableCellElement[] = []

    tables?.forEach((node) => {
      const table = node.element as HTMLTableElement
      if (!table || !table.rows.length) return

      result.push(...Array.from(table.rows[0].cells))
    })

    return result
  }, [editor])

  return (
    <>
      {cells.map((cell, index) => (
        <ColumnDropdown
          key={index}
          cell={cell}
          visible={active || hoveredCol === index}
        />
      ))}
    </>
  )
}


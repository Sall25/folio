import { Editor } from '@tiptap/react'
import { useEffect, useRef, useState } from 'react'
import { getColumnFromCoords, getHeaderDomForColumn } from './.Utils'

type Props = { editor: Editor }

export function ColumnFloatingMenu({ editor }: Props) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!editor) return

    const handleMouseMove = (e: MouseEvent) => {
      const info = getColumnFromCoords(editor, e.clientX, e.clientY)
      const menu = menuRef.current

      if (!info || !menu) {
        setVisible(false)
        return
      }

      const headerDom = getHeaderDomForColumn(
        editor,
        info.colIndex,
        info.tableNode,
        info.tableStart,
      )

      if (!headerDom) {
        setVisible(false)
        return
      }

      const rect = headerDom.getBoundingClientRect()

      // Only show if mouse is near top edge of the header cell
      const isNearTop = e.clientY >= rect.top && e.clientY <= rect.top + 10
      if (!isNearTop) {
        setVisible(false)
        return
      }

      const menuRect = menu.getBoundingClientRect()

      menu.style.top = `${rect.top - menuRect.height - 6 + window.scrollY}px`
      menu.style.left = `${rect.left + rect.width / 2 - menuRect.width / 2 + window.scrollX}px`

      setVisible(true)
    }

    const handleLeaveEditor = () => setVisible(false)

    const dom = editor.view.dom
    dom.addEventListener('mousemove', handleMouseMove)
    dom.addEventListener('mouseleave', handleLeaveEditor)

    return () => {
      dom.removeEventListener('mousemove', handleMouseMove)
      dom.removeEventListener('mouseleave', handleLeaveEditor)
    }
  }, [editor])

  return (
    <div
      ref={menuRef}
      style={{
        position: 'absolute',
        zIndex: 1000,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 0.12s ease',
      }}
      className="column-menu"
    >
      <button onClick={() => editor.commands.addColumnBefore()}>←</button>
      <button onClick={() => editor.commands.addColumnAfter()}>→</button>
      <button onClick={() => editor.commands.deleteColumn()}>✕</button>
    </div>
  )
}

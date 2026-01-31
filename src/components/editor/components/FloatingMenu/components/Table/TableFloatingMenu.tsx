import { useEffect, useRef, useState, useCallback } from 'react'
import {
  computePosition,
  offset,
  shift,
  flip,
  autoUpdate,
  type VirtualElement,
} from '@floating-ui/dom'
import type { Editor } from '@tiptap/core'
import { MoreHorizontal } from 'lucide-react'
import * as Popover from '@radix-ui/react-popover'
import { ColumnDropdown } from './ColumnDropdown'

export function TableFloatingMenu({ editor }: { editor: Editor }) {
  const [visible, setVisible] = useState(false)

  /** -------------------------------
   *  Floating + Virtual Anchor Setup
   *  ------------------------------- */
  const floatingRef = useRef<HTMLElement | null>(null)
  const frameRef = useRef<number | null>(null)

  const rectRef = useRef({ x: 0, y: 0, width: 0, height: 0 })

  const virtualRef = useRef<VirtualElement>({
    getBoundingClientRect: () => ({
      x: rectRef.current.x,
      y: rectRef.current.y,
      left: rectRef.current.x,
      top: rectRef.current.y,
      right: rectRef.current.x + rectRef.current.width,
      bottom: rectRef.current.y + rectRef.current.height,
      width: rectRef.current.width,
      height: rectRef.current.height,
    }),
  })

  /** Snap animation between columns */
  const prevXRef = useRef<number | null>(null)
  const snapOffsetRef = useRef(0)

  const updatePosition = useCallback(async () => {
    if (!floatingRef.current) return

    const { x, y } = await computePosition(
      virtualRef.current,
      floatingRef.current,
      {
        placement: 'top-start',
        middleware: [offset(1), shift({ padding: 8 }), flip()],
      }
    )

    floatingRef.current.style.width = `${rectRef.current.width}px`
    floatingRef.current.style.transform = `translate(${x}px, ${y}px)`
    floatingRef.current.style.setProperty('--snap-x', `${snapOffsetRef.current}px`)

    requestAnimationFrame(() => {
      snapOffsetRef.current = 0
      floatingRef.current?.style.setProperty('--snap-x', '0px')
    })
  }, [])

  const scheduleUpdate = () => {
    if (frameRef.current) return
    frameRef.current = requestAnimationFrame(() => {
      updatePosition()
      frameRef.current = null
    })
  }

  /** -------------------------------
   *  Column + Table Tracking
   *  ------------------------------- */
  const lastColumnRef = useRef<number | null>(null)

  const updateFromCell = (cell: HTMLElement) => {
    const row = cell.parentElement
    const table = cell.closest('table')
    if (!row || !table) return

    const columnIndex = Array.from(row.children).indexOf(cell)
    if (columnIndex === lastColumnRef.current) return
    lastColumnRef.current = columnIndex

    const headerRow = table.querySelector('tr')
    const headerCell = headerRow?.children[columnIndex] as HTMLElement | undefined
    if (!headerCell) return

    const rect = headerCell.getBoundingClientRect()

    rectRef.current = {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    }

    if (prevXRef.current !== null) {
      snapOffsetRef.current = prevXRef.current - rect.left
    }
    prevXRef.current = rect.left

    scheduleUpdate()
    showMenu()
  }

  /** -------------------------------
   *  Resize Tracking
   *  ------------------------------- */
  const isResizingRef = useRef(false)

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('.column-resize-handle')) {
        isResizingRef.current = true
      }
    }

    const onMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false
        lastColumnRef.current = null
      }
    }

    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  /** -------------------------------
   *  Visibility Control
   *  ------------------------------- */
  const hideTimeout = useRef<number | null>(null)

  const showMenu = () => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current)
    setVisible(true)
  }

  const hideMenu = () => {
    hideTimeout.current = window.setTimeout(() => {
      setVisible(false)
    }, 800)
  }

  /** -------------------------------
   *  Mouse Tracking inside Editor
   *  ------------------------------- */
  useEffect(() => {
    if (!editor) return
    const editorDom = editor.view.dom

    const onMouseMove = (e: MouseEvent) => {
      if (isResizingRef.current) return

      const pos = editor.view.posAtCoords({ left: e.clientX, top: e.clientY })
      if (!pos) return

      const resolved = editor.view.state.doc.resolve(pos.pos)

      let cellDom: HTMLElement | null = null
      for (let d = resolved.depth; d > 0; d--) {
        const node = resolved.node(d)
        if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
          cellDom = editor.view.nodeDOM(resolved.before(d)) as HTMLElement
          break
        }
      }

      if (!cellDom) {
        lastColumnRef.current = null
        hideMenu()
        return
      }

      updateFromCell(cellDom)
    }

    editorDom.addEventListener('mousemove', onMouseMove)
    return () => editorDom.removeEventListener('mousemove', onMouseMove)
  }, [editor])

  /** Floating auto update (scroll/resize) */
  useEffect(() => {
    if (!floatingRef.current) return
    return autoUpdate(virtualRef.current, floatingRef.current, updatePosition)
  }, [updatePosition])

  useEffect(() => {
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [])

  if (!editor) return null

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <span
          ref={(node) => { floatingRef.current = node }}
          className="column-menu"
          data-visible={visible}
          onMouseDown={showMenu}
        >
          <div className="column-menu__inner">
            <MoreHorizontal className="icon" />
          </div>
        </span>
      </Popover.Trigger>

      <Popover.Content>
        <ColumnDropdown editor={editor} />
      </Popover.Content>
    </Popover.Root>
  )
}

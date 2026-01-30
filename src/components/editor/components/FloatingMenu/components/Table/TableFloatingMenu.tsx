import { useEffect, useRef, useState } from 'react'
import { computePosition, offset, shift, flip, autoUpdate, type VirtualElement } from '@floating-ui/dom'
import type { Editor } from '@tiptap/core'

export function TableFloatingMenu({ editor }: { editor: Editor }) {
  const [visible, setVisible] = useState(false)
  const floatingRef = useRef<HTMLElement | null>(null)
  const isResizingRef = useRef(false)

  // const posX = useRef(0)
  // const posY = useRef(0)

  const lastColumnRef = useRef<number | null>(null)
  const frameRef = useRef<number | null>(null)

  const rectRef = useRef({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  })

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

  const prevXRef = useRef<number | null>(null)
  const snapOffsetRef = useRef(0)



  const updatePosition = async () => {
    if (isResizingRef.current) {
      const headerCell = document.elementFromPoint(
        rectRef.current.x + rectRef.current.width / 2,
        rectRef.current.y + 2
      )?.closest('th, td') as HTMLElement | null

      if (headerCell) {
        const rect = headerCell.getBoundingClientRect()
        rectRef.current.width = rect.width
        rectRef.current.x = rect.left
      }
    }

    if (!floatingRef.current) return

    const { x, y } = await computePosition(virtualRef.current, floatingRef.current, {
      placement: 'top-start',
      middleware: [offset(6), shift({ padding: 8 }), flip()],
    })

    floatingRef.current.style.width = `${rectRef.current.width}px`
    floatingRef.current.style.transform = `translate(${x}px, ${y}px)`
    floatingRef.current.style.setProperty(
      '--snap-x',
      `${snapOffsetRef.current}px`
    )

    // Reset after frame so it animates back to 0
    requestAnimationFrame(() => {
      snapOffsetRef.current = 0
      floatingRef.current?.style.setProperty('--snap-x', '0px')
    })

  }

  //  Throttle to animation frames
  const scheduleUpdate = () => {
    if (frameRef.current) return
    frameRef.current = requestAnimationFrame(() => {
      updatePosition()
      frameRef.current = null
    })
  }

  const hideTimeout = useRef<number | null>(null)

  const showMenu = () => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current)
    setVisible(true)
  }

  const hideMenu = () => {
    hideTimeout.current = window.setTimeout(() => {
      setVisible(false)
    }, 80)
  }


  useEffect(() => {
    if (!editor) return

    const editorDom = editor.view.dom

    const onMouseMoveEditor = (e: MouseEvent) => {
      if (isResizingRef.current) return

      const pos = editor.view.posAtCoords({ left: e.clientX, top: e.clientY })
      if (!pos) return

      const resolved = editor.view.state.doc.resolve(pos.pos)

      let cellDom: HTMLElement | null = null

      // Find closest table cell/header node
      for (let d = resolved.depth; d > 0; d--) {
        const node = resolved.node(d)
        if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
          const cellPos = resolved.before(d)
          cellDom = editor.view.nodeDOM(cellPos) as HTMLElement | null
          break
        }
      }

      if (!cellDom) {
        lastColumnRef.current = null
        hideMenu()
        return
      }

      const row = cellDom.parentElement
      if (!row) return

      const columnIndex = Array.from(row.children).indexOf(cellDom)

      //  Skip work if still in same column
      if (columnIndex === lastColumnRef.current) return
      lastColumnRef.current = columnIndex

      const table = cellDom.closest('table')
      if (!table) return

      const headerRow = table.querySelector('tr')
      if (!headerRow) return

      const headerCell = headerRow.children[columnIndex] as HTMLElement | undefined
      if (!headerCell) return

      const rect = headerCell.getBoundingClientRect()


      rectRef.current = {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      }
      // // Anchor to center-top of header cell
      // posX.current = rect.left + rect.width / 2
      // posY.current = rect.top

      const newX = rect.left

      if (prevXRef.current !== null) {
        snapOffsetRef.current = prevXRef.current - newX
      }

      prevXRef.current = newX


      scheduleUpdate()
      showMenu()
    }
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('.column-resize-handle')) {
        isResizingRef.current = true
      }
    }

    const onMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false
        lastColumnRef.current = null // force recalculation
      }
    }

    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('mouseup', onMouseUp)
    editorDom.addEventListener('mousemove', onMouseMoveEditor)

    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('mouseup', onMouseUp)
      editorDom.removeEventListener('mousemove', onMouseMoveEditor)
    }
  }, [editor])

  // Floating UI auto updates (scroll, resize, etc.)
  useEffect(() => {
    if (!floatingRef.current) return
    return autoUpdate(virtualRef.current, floatingRef.current, updatePosition)
  }, [])

  // Cleanup any pending animation frame
  useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [])

  if (!editor) return null

  return (
    <div
      ref={(node) => {
        floatingRef.current = node;
      }}
      className="column-menu"
      data-visible={visible}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        transform: 'translate(0,0)',
        zIndex: 1000,
        pointerEvents: 'none',
      }}
    >
      <div className="column-menu__inner">
        <span>Hi there</span>
      </div>
    </div>

  )
}

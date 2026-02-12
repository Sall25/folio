import { useEffect, useRef, useState } from 'react'
import {
  computePosition,
  offset,
  autoUpdate,
  type VirtualElement,
  shift,
} from '@floating-ui/dom'
import type { Editor } from '@tiptap/core'
import { MoreVertical } from 'lucide-react'
import * as Popover from '@radix-ui/react-popover'
import { tableMenuPluginKey } from './extensions/plugins/tableMenuPlugin'
import { RowDropdown } from './RowDropdown'
import clsx from 'clsx'

export function RowFloatingMenu({ editor }: { editor: Editor }) {
  const floatingRef = useRef<HTMLElement | null>(null)
  const popoverContentRef = useRef<HTMLDivElement | null>(null)
  const posX = useRef(0)
  const posY = useRef(0)
  const height = useRef(0)
  const rowStartRef = useRef(0)
  const rowEndRef = useRef(0)
  const openPopoverRef = useRef(false)
  const overTableRef = useRef(false)
  const tablePosRef = useRef<number | null>(null)
  const rowIndexRef = useRef<number | null>(null)
  const [rowIdx, setRowIdx] = useState<number | null>(null)
  const [visible, setVisible] = useState(false)
  const [ready, setReady] = useState(false)
  const [menuVisible, setMenuVisible] = useState(false)

  const virtualRef = useRef<VirtualElement>({
    getBoundingClientRect: () => {
      return {
        x: posX.current,
        y: posY.current,
        left: posX.current,
        right: posX.current,
        top: posY.current,
        bottom: posY.current,
        width: 0,
        height: height.current
      }
    }
  })

  const updatePosition = async () => {
    if (!floatingRef.current) return

    const { x, y } = await computePosition(virtualRef.current, floatingRef.current, {
      placement: 'left',
      middleware: [
        offset(4),
        shift({ padding: 8 })
      ]
    })
    floatingRef.current.style.transform = `translate(${x}px, ${y}px)`
    floatingRef.current.style.height = `${height.current}px`
    setReady(true)
  }

  const openMenu = () => {
    setVisible(true)
    if (floatingRef.current) {
      floatingRef.current.style.visibility = 'visible'
    }
  }
  const closeMenu = () => {
    if (openPopoverRef.current) {
      return
    }
    setVisible(false)
  }

  useEffect(() => {
    if (!editor) return

    let currentTable: HTMLElement | null = null

    const handleTableEnter = () => {
      overTableRef.current = true
      openMenu()

    }
    const handleTableLeave = () => {
      overTableRef.current = false
      closeMenu()
      if (floatingRef.current) {
        floatingRef.current.style.visibility = 'visible'
      }
    }
    const handleFloatingEnter = () => {
      openMenu()
    }
    const handleFloatingLeave = () => {
      closeMenu()
    }
    const handleScroll = () => {
      closeMenu()
      if (floatingRef.current) {
        floatingRef.current.style.visibility = 'hidden'
      }
    }

    const update = () => {
      if (openPopoverRef.current === true) {
        return
      }

      const tableState = tableMenuPluginKey.getState(editor.state)
      if (!tableState || !tableState.headerCellRect || !tableState.parentTableDOM) {
        return
      }

      const { rowRect, parentTableDOM, tablePos, rowIndex, rowStart, rowEnd } = tableState

      tablePosRef.current = tablePos
      rowIndexRef.current = rowIndex

      setRowIdx(rowIndex)


      // If table DOM changed, rebind listeners
      if (currentTable !== parentTableDOM) {
        if (currentTable) {
          currentTable.removeEventListener("mouseenter", handleTableEnter)
          currentTable.removeEventListener("mousemove", handleTableEnter)
          currentTable.removeEventListener("mouseleave", handleTableLeave)
        }

        currentTable = parentTableDOM
        currentTable.addEventListener("mouseenter", handleTableEnter)
        currentTable.addEventListener("mousemove", handleTableEnter)
        currentTable.addEventListener("mouseleave", handleTableLeave)
      }
      if (!rowRect) {
        closeMenu()
        return
      }

      rowStartRef.current = rowStart
      rowEndRef.current = rowEnd

      //  Update menu position
      posX.current = rowRect.left
      posY.current = rowRect.top
      height.current = rowRect.height

      updatePosition()
      if (!overTableRef.current) {
        closeMenu()
        return
      }

      openMenu()
    }


    editor.on("transaction", update)
    window.addEventListener('scroll', handleScroll)


    floatingRef.current?.addEventListener('mouseenter', handleFloatingEnter)
    floatingRef.current?.addEventListener('mouseleave', handleFloatingLeave)


    return () => {
      editor.off("transaction", update)
      window.removeEventListener('scroll', handleScroll)

      floatingRef.current?.removeEventListener('mouseenter', handleFloatingEnter)
      floatingRef.current?.removeEventListener('mouseleave', handleFloatingLeave)

      if (currentTable) {
        currentTable.removeEventListener("mouseenter", handleTableEnter)
        currentTable.removeEventListener("mousemove", handleTableEnter)
        currentTable.removeEventListener("mouseleave", handleTableLeave)
      }
    }
  }, [editor, visible])


  useEffect(() => {
    if (!floatingRef.current) return
    const cleanup = autoUpdate(virtualRef.current, floatingRef.current, updatePosition)

    return () => cleanup()
  }, [])

  useEffect(() => {
    const id = requestAnimationFrame(() => setMenuVisible(true))

    return () => cancelAnimationFrame(id)
  })

  return (
    <Popover.Root
      onOpenChange={(open) => {
        openPopoverRef.current = open
        editor.commands.selectRow({ rowIndex: rowIndexRef.current!, tablePos: tablePosRef.current! })
        if (!open) {
          editor.view.focus()
        }
      }}
    >
      <Popover.Trigger asChild>
        <span
          ref={(node) => { floatingRef.current = node }}
          className={clsx('column-menu', { active: menuVisible })}
          data-visible={visible && ready}
        >
          <div
            className="column-menu__inner"
            style={{
              height: 'inherit',
              width: '11px'
            }}
          >
            <MoreVertical size={11} />
          </div>
        </span>
      </Popover.Trigger>

      <Popover.Content
        ref={(node) => {
          popoverContentRef.current = node
        }}
        side="bottom"
        align="center"
        sideOffset={4}
        className='dropdown-menu active'
      //alignOffset={-25}
      >
        <RowDropdown editor={editor} rowIndex={rowIdx!} />
      </Popover.Content>
    </Popover.Root>
  )
}

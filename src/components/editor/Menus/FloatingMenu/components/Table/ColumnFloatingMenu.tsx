/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef, useState } from 'react'
import {
  computePosition,
  offset,
  autoUpdate,
  type VirtualElement,
  shift,
} from '@floating-ui/dom'
import { type Editor } from '@tiptap/core'
import { MoreHorizontal } from 'lucide-react'
import * as Popover from '@radix-ui/react-popover'
import { ColumnDropdown } from './ColumnDropdown'
import { tableMenuPluginKey } from './extensions/plugins/tableMenuPlugin'


export function ColumnFloatingMenu({ editor }: { editor: Editor }) {
  const floatingRef = useRef<HTMLElement | null>(null)
  const popoverContentRef = useRef<HTMLDivElement | null>(null)

  const posX = useRef(0)
  const posY = useRef(0)
  const width = useRef(0)
  const openPopoverRef = useRef(false)
  const [columnIdx, setColumnIdx] = useState<number | null>(null)
  const columnIndexRef = useRef<number | null>(null)
  const tablePosRef = useRef<number | null>(null)
  const overTableRef = useRef(false)
  const [visible, setVisible] = useState(false)
  const [ready, setReady] = useState(false)

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
        height: 0
      }
    }
  })

  const updatePosition = async () => {
    if (!floatingRef.current) return

    const { x, y } = await computePosition(virtualRef.current, floatingRef.current, {
      placement: 'top-start',
      middleware: [
        offset(4),
        shift({ padding: 8 })
      ]
    })
    floatingRef.current.style.transform = `translate(${x}px, ${y}px)`
    floatingRef.current.style.width = `${width.current}px`
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
      setVisible(false)
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

      const { headerCellRect, parentTableDOM, columnIndex, tablePos } = tableState

      setColumnIdx(columnIndex)

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

      columnIndexRef.current = columnIndex
      tablePosRef.current = tablePos


      //  Update menu position
      posX.current = headerCellRect.left
      posY.current = headerCellRect.top
      width.current = headerCellRect.width

      updatePosition()

      if (!overTableRef.current) {
        closeMenu()
        return
      }
      openMenu()

    }

    editor.on("transaction", update)
    floatingRef.current?.addEventListener('mouseenter', handleFloatingEnter)
    floatingRef.current?.addEventListener('mouseleave', handleFloatingLeave)
    window.addEventListener('scroll', handleScroll)


    return () => {
      editor.off("transaction", update)
      floatingRef.current?.removeEventListener('mouseenter', handleFloatingEnter)
      floatingRef.current?.removeEventListener('mouseleave', handleFloatingLeave)
      // editor.off("blur", blurHandler)
      window.removeEventListener('scroll', handleScroll)


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

  return (
    <Popover.Root
      onOpenChange={(open) => {
        openPopoverRef.current = open

        // const tr = editor.state.tr.setMeta(activeColumnPluginKey, {
        //   active: open,
        //   columnIndex: columnIndexRef.current,
        //   tablePos: tablePosRef.current
        // })
        // editor.view.dispatch(tr)
        if (open) {


          editor.commands.sortColumn({ columnIndex: columnIndexRef.current!, direction: 'asc' })

          // const tr = editor.state.tr.setMeta(alignCellPluginKey, { align: 'center' })
          // editor.view.dispatch(tr)

          editor.commands.selectColumn({ columnIndex: columnIndexRef.current!, tablePos: tablePosRef.current! })

          // selectColumn(editor.view, tablePosRef.current!, columnIndexRef.current!)

          // editor.commands.alignColumn('center')

          editor.commands.setColumnStyle({ color: 'lightpink' })
          editor.commands.setColumnStyle({ textAlign: 'center' })

          //  editor.commands.clearColumn()

        }


      }}
    >
      <Popover.Trigger asChild>
        <span
          ref={(node) => { floatingRef.current = node }}
          className="column-menu"
          data-visible={visible && ready}
        >
          <div className="column-menu__inner" style={{
            height: '12px'
          }}>
            <MoreHorizontal size={12} />
          </div>
        </span>
      </Popover.Trigger>

      <Popover.Content
        ref={(node) => {
          popoverContentRef.current = node
        }}
        side="bottom"
        align="center"
        sideOffset={8}
        className='dropdown-menu active overflow-auto'
      >
        <ColumnDropdown editor={editor} columnIndex={columnIdx!} />
      </Popover.Content>
    </Popover.Root>

  )
}

import { autoUpdate, computePosition, offset, shift, type VirtualElement } from "@floating-ui/dom";
import { Editor } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import { tableMenuPluginKey } from "./extensions/plugins/tableMenuPlugin";
import { Plus } from "lucide-react";
import clsx from "clsx";

export function ColumnAddFloatingMenu({ editor }: { editor: Editor }) {
  const floatingRef = useRef<HTMLElement | null>(null)
  const posX = useRef(0)
  const posY = useRef(0)
  const isLastColumnRef = useRef(false)
  const tableHeight = useRef(0)
  const overTableRef = useRef(false)
  const [visible, setVisible] = useState(false)
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
        height: tableHeight.current
      }
    }
  });


  const openMenu = () => {
    setVisible(true)
    if (floatingRef.current) {
      floatingRef.current.style.visibility = 'visible'
    }
  }
  const closeMenu = () => {
    setVisible(false)
  }



  const updatePosition = async () => {
    if (!floatingRef.current) return

    const { x, y } = await computePosition(virtualRef.current, floatingRef.current, {
      placement: 'right',
      middleware: [
        offset(4),
        shift({ padding: 8 })
      ]
    })

    floatingRef.current.style.transform = `translate(${x}px, ${y}px)`
    floatingRef.current.style.height = `${tableHeight.current}px`
  }

  useEffect(() => {
    if (!editor) return

    let currentTable: HTMLElement | null = null


    const handleTableEnter = () => {
      overTableRef.current = true
      if (isLastColumnRef.current) {
        openMenu()

      }
    }
    const handleTableLeave = () => {
      overTableRef.current = false
      closeMenu()

      if (floatingRef.current) {
        floatingRef.current.style.visibility = 'visible'
      }
    }


    const handleFloatingEnter = () => {
      overTableRef.current = true
      openMenu()
    }
    const handleFloatingLeave = () => {
      closeMenu()
    }

    const handleScroll = () => {
      setVisible(false)
      if (floatingRef.current)
        floatingRef.current.style.visibility = 'hidden'
    }


    const update = () => {
      const tableState = tableMenuPluginKey.getState(editor.state)
      if (!tableState || !tableState.parentTableDOM || !tableState.headerCellRect)
        return

      const { isLastColumn, parentTableDOM } = tableState


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

      isLastColumnRef.current = isLastColumn
      // //  If not last column, menu must hide
      if (!isLastColumn) {
        closeMenu()
        return
      }

      // Update menu position
      posX.current = parentTableDOM.getBoundingClientRect().right
      posY.current = parentTableDOM.getBoundingClientRect().top
      tableHeight.current = parentTableDOM.getBoundingClientRect().height

      updatePosition()
      if (!overTableRef.current) {
        closeMenu()
        return
      }
      openMenu()

    }

    editor.on('transaction', update)
    window.addEventListener('scroll', handleScroll)
    floatingRef.current?.addEventListener('mouseenter', handleFloatingEnter)
    floatingRef.current?.addEventListener('mouseleave', handleFloatingLeave)

    return () => {
      editor.off('transaction', update)
      floatingRef.current?.removeEventListener('mouseenter', handleFloatingEnter)
      floatingRef.current?.removeEventListener('mouseleave', handleFloatingLeave)
      window.removeEventListener('scroll', handleScroll)

      if (currentTable) {
        currentTable.removeEventListener("mouseenter", handleTableEnter)
        currentTable.removeEventListener("mousemove", handleTableEnter)
        currentTable.removeEventListener("mouseleave", handleTableLeave)
      }
    }
  }, [editor])

  useEffect(() => {
    if (!floatingRef.current) return
    const cleanup = autoUpdate(virtualRef.current, floatingRef.current, updatePosition)

    return () => cleanup()
  }, [])

  useEffect(() => {
    const id = requestAnimationFrame(() => setMenuVisible(true))

    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div
      ref={(node) => {
        floatingRef.current = node
      }}
      className={clsx('column-menu', { active: menuVisible })}
      data-visible={visible}
      onClick={(e) => {
        e.preventDefault()
        editor.commands.addColumnToRightTable()
      }}
    >
      <span
        className="column-menu__inner"
        style={{
          height: 'inherit',
          cursor: 'pointer',
          width: '11px',

        }}
      >
        <Plus size={11} />
      </span>
    </div>
  );
}

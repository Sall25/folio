import { autoUpdate, computePosition, offset, shift, type VirtualElement } from "@floating-ui/dom";
import { Editor } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import { tableMenuPluginKey } from "./extensions/plugins/tableMenuPlugin";
import { Plus } from "lucide-react";
import clsx from "clsx";

export function RowAddFloatingMenu({ editor }: { editor: Editor }) {
  const floatingRef = useRef<HTMLElement | null>(null)
  const posX = useRef(0)
  const posY = useRef(0)
  const tableWidth = useRef(0)
  const islastRowRef = useRef(false)
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
        width: tableWidth.current,
        height: 0
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
      placement: 'bottom',
      middleware: [
        offset(4),
        shift({ padding: 8 })

      ]
    })

    floatingRef.current.style.transform = `translate(${x}px, ${y}px)`
    floatingRef.current.style.width = `${tableWidth.current}px`
  }

  useEffect(() => {
    if (!editor) return

    let currentTable: HTMLElement | null = null

    const handleTableEnter = () => {
      overTableRef.current = true
      if (islastRowRef.current) {
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
      const tableState = tableMenuPluginKey.getState(editor.state)
      if (!tableState || !tableState.parentTableDOM)
        return

      const { isLastRow, parentTableDOM } = tableState

      islastRowRef.current = isLastRow

      // If table DOM changed, rebind listeners
      if (currentTable !== parentTableDOM) {
        if (currentTable) {
          currentTable.removeEventListener("mouseenter", handleTableEnter)
          currentTable.removeEventListener("mousemove", handleTableEnter)
          // currentTable.removeEventListener("mousemove", handleMouseEnter)
          currentTable.removeEventListener("mouseleave", handleTableLeave)
        }

        currentTable = parentTableDOM
        currentTable.addEventListener("mouseenter", handleTableEnter)
        currentTable.addEventListener("mousemove", handleTableEnter)
        // currentTable.addEventListener("mousemove", handleMouseEnter)
        currentTable.addEventListener("mouseleave", handleTableLeave)
      }

      // Update menu position
      posX.current = parentTableDOM.getBoundingClientRect().left
      posY.current = parentTableDOM.getBoundingClientRect().bottom
      tableWidth.current = parentTableDOM.getBoundingClientRect().width
      updatePosition()

      if (!islastRowRef.current) {
        closeMenu()
        return
      }

      if (!overTableRef.current) {
        closeMenu()
        return
      }

      openMenu()
    }

    editor.on('transaction', update)
    floatingRef.current?.addEventListener('mouseenter', handleFloatingEnter)
    floatingRef.current?.addEventListener('mouseleave', handleFloatingLeave)
    window.addEventListener('scroll', handleScroll)

    return () => {
      editor.off('transaction', update)
      window.removeEventListener('scroll', handleScroll)

      floatingRef.current?.removeEventListener('mouseenter', handleFloatingEnter)
      floatingRef.current?.removeEventListener('mouseleave', handleFloatingLeave)

      if (currentTable) {
        currentTable.removeEventListener("mouseenter", handleTableEnter)
        currentTable.removeEventListener("mousemove", handleTableEnter)
        //  currentTable.removeEventListener("mousemove", handleMouseEnter)
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
      onClick={() => {
        editor.commands.addRowAtBottomTable()
      }}
    >
      <span
        className="column-menu__inner"
        style={{
          width: 'inherit',
          cursor: 'pointer',
          height: '11px',
        }}
      >
        <Plus size={11} />
      </span>
    </div>
  );
}
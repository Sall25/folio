import { computePosition, type ComputePositionConfig, type VirtualElement } from "@floating-ui/dom"
import { Editor } from "@tiptap/core"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { TableMap } from "prosemirror-tables"
import { getCellIndices, getTableContext } from "../utils/utils"
import { getRowDOMRect } from "../utils/utils"
import { removeNode } from "../ColumnDragHandle"

export interface RowDragHandlePluginProps {
  pluginKey?: PluginKey | string
  editor: Editor
  element: HTMLElement
  onRowNodeChange?: (data: { editor: Editor, tablePos: number, rowIndex: number, rect: DOMRect | null }) => void
  computePositionConfig?: ComputePositionConfig
}

export const rowDragHandlePluginDefaultKey = new PluginKey('rowDragHandlePluginKey')

export const RowDragHandlePlugin = ({
  pluginKey = rowDragHandlePluginDefaultKey,
  editor,
  element,
  computePositionConfig,
  onRowNodeChange,
}: RowDragHandlePluginProps) => {
  const wrapper = document.createElement('div')

  let locked = false
  let currentTablePos = -1
  let currentRowIndex = -1
  let rafId: number | null = null

  function hideHandle() {
    element.style.visibility = 'hidden'
    element.style.pointerEvents = 'none'
  }

  function showHandle() {
    if (!editor.isEditable) return hideHandle()
    element.style.visibility = ''
    element.style.pointerEvents = 'auto'
  }

  function repositionDragHandle(rect: DOMRect) {
    const virtual: VirtualElement = {
      getBoundingClientRect: () => rect,
    }

    computePosition(virtual, element, computePositionConfig).then(pos => {
      Object.assign(element.style, {
        position: pos.strategy,
        left: `${pos.x}px`,
        top: `${pos.y}px`,
      })
    })
  }

  wrapper.appendChild(element)

  return {
    unbind() {
      if (rafId) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
    },

    plugin: new Plugin({
      key: typeof pluginKey === 'string' ? new PluginKey(pluginKey) : pluginKey,

      state: {
        init: () => ({ locked: false }),
        apply(tr, value) {

          const isLocked = tr.getMeta('lockRowDragHandle')
          const hide = tr.getMeta('hideRowDragHandle')

          if (isLocked !== undefined) locked = isLocked

          if (hide) {
            hideHandle()
            currentRowIndex = -1
            currentTablePos = -1
            onRowNodeChange?.({ editor, tablePos: -1, rowIndex: -1, rect: null })
          }

          return value
        },
      },

      view: () => {
        element.draggable = true
        editor.view.dom.parentElement?.appendChild(wrapper)

        Object.assign(wrapper.style, {
          pointerEvents: 'none',
          position: 'absolute',
          top: '0',
          left: '0',
        })

        return {
          update(view, prev) {
            if (!element) return

            if (!editor.isEditable) {
              hideHandle()
              return
            }

            if (view.state.doc.eq(prev.doc) || currentRowIndex === -1) return

            const $pos = view.state.doc.resolve(currentTablePos)
            if ($pos.node()) return

            const map = TableMap.get($pos.node())

            const rect = getRowDOMRect(map, currentTablePos, currentRowIndex, view)
            onRowNodeChange?.({ editor, tablePos: currentTablePos, rowIndex: currentRowIndex, rect })

            if (rect) repositionDragHandle(rect)
          },

          destroy() {
            if (rafId) {
              cancelAnimationFrame(rafId)
              rafId = null
            }
            if (element) {
              removeNode(wrapper)
            }
          },
        }
      },

      props: {
        handleDOMEvents: {
          mousemove(view, e) {
            if (!element || locked) return false

            if (rafId) {
              return false
            }

            rafId = requestAnimationFrame(() => {
              rafId = null

              const ctx = getTableContext(view, e)
              if (!ctx) {

                return
              }

              const { cell, table } = ctx

              const { map, rowIndex } = getCellIndices(table.node, cell.pos, table.pos)


              const rect = getRowDOMRect(map, table.pos, rowIndex, view)

              if (currentRowIndex !== rowIndex || currentTablePos !== table.pos) {

                currentRowIndex = rowIndex
                currentTablePos = table.pos

                onRowNodeChange?.({ editor, tablePos: table.pos, rowIndex, rect })

                if (rect) repositionDragHandle(rect)
                showHandle()
              }
            })

            return false
          },

          mouseleave(_, e) {
            if (!wrapper.contains(e.relatedTarget as HTMLElement)) {
              hideHandle()
              currentRowIndex = -1
              currentTablePos = -1
              onRowNodeChange?.({ editor, tablePos: -1, rowIndex: -1, rect: null })
            }
            return false
          },
        },
      },
    }),
  }
}

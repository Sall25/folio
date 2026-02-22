import { computePosition, type ComputePositionConfig, type VirtualElement } from "@floating-ui/dom"
import { Editor } from "@tiptap/core"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { getCellIndices, getColumnDOMRect, getTableContext } from "../utils/utils"
import { TableMap } from "prosemirror-tables"


export interface ColumnDragHandlePluginProps {
  pluginKey?: PluginKey | string
  editor: Editor
  element: HTMLElement
  onColumnNodeChange?: (data: { editor: Editor, tablePos: number, columnIndex: number, rect: DOMRect | null }) => void,
  computePositionConfig?: ComputePositionConfig
}

export function removeNode(node: HTMLElement) {
  node.parentNode?.removeChild(node)
}


export const columnDragHandlePluginDefaultKey = new PluginKey('columnDragHandlePluginKey')

export const ColumnDragHandlePlugin = ({
  pluginKey = columnDragHandlePluginDefaultKey,
  editor,
  element,
  computePositionConfig,
  onColumnNodeChange
}: ColumnDragHandlePluginProps) => {
  const wrapper = document.createElement('div')
  let locked = false
  let currentTablePos = -1
  let currentColumnIndex = -1

  let rafId: number | null = null

  function hideHandle() {
    if (!element) return

    element.style.visibility = 'hidden'
    element.style.pointerEvents = 'none'
  }

  function showHandle() {
    if (!element) return

    if (!editor.isEditable) {
      hideHandle()
      return
    }
    element.style.visibility = ''
    element.style.pointerEvents = 'auto'
  }

  function repositionDragHandle(rect: DOMRect) {
    const virtualElement: VirtualElement = {
      getBoundingClientRect: () => rect
    }

    computePosition(virtualElement, element, computePositionConfig).then(val => {
      Object.assign(element.style, {
        position: val.strategy,
        left: `${val.x}px`,
        top: `${val.y}px`
      })
    })
  }

  /**
   * function onDragStart(e: DragEvent){}
   * function onDragEnd(e: DragEvent){}
   * 
   * element.addEventListener('dragStart', onDragStart)
   * element.addEventListener('dragEnd', onDragEnd)
   */
  wrapper.appendChild(element)

  return {
    unbind() {
      /**
       * TODO
       * element.removeEventListener('dragStart', onDragStart)
       * element.removeEventListener('dragEnd', onDragEnd)
       */
      if (rafId) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
    },

    plugin: new Plugin({
      key: typeof pluginKey === 'string' ? new PluginKey(pluginKey) : pluginKey,

      state: {
        init() {
          return { locked: false }
        },
        apply(tr, value) {
          const isLocked = tr.getMeta('lockColumnDragHandle')
          const hideDragHandle = tr.getMeta('hideColumnDragHandle')

          if (isLocked !== undefined) {
            locked = isLocked
          }

          if (hideDragHandle) {
            hideHandle()

            locked = false
            currentColumnIndex = -1
            currentTablePos = -1

            onColumnNodeChange?.({ editor, tablePos: -1, columnIndex: -1, rect: null })

            return value
          }
          return value
        },
      },
      view: () => {
        element.draggable = true
        element.style.pointerEvents = 'auto'
        element.dataset.dragging = 'false'

        editor.view.dom.parentElement?.appendChild(wrapper)

        wrapper.style.pointerEvents = 'none'
        wrapper.style.position = 'absolute'
        wrapper.style.top = '0'
        wrapper.style.left = '0'

        return {
          update(view, prevState) {
            if (!element) {
              return
            }
            if (!editor.isEditable) {
              hideHandle()
              return
            }

            if (locked) {
              element.draggable = false
            } else {
              element.draggable = true
            }

            // Recalculate popup position if doc has changend and drag handler is visible.
            if (view.state.doc.eq(prevState.doc) || currentColumnIndex === -1) {
              return
            }

            const $pos = view.state.doc.resolve(currentTablePos)
            if ($pos.node()) return

            const map = TableMap.get($pos.node())
            const rect = getColumnDOMRect(map, currentTablePos, currentColumnIndex, view)

            onColumnNodeChange?.({ editor, tablePos: currentTablePos, columnIndex: currentColumnIndex, rect })

            if (rect) {
              repositionDragHandle(rect)
            }
          },
          destroy() {
            if (rafId) {
              cancelAnimationFrame(rafId)
              rafId = null
            }
            if (element) {
              removeNode(wrapper)
            }
          }
        }
      },

      props: {
        handleDOMEvents: {
          keydown(view) {
            if (!element || locked) return false

            if (view.hasFocus()) {
              hideHandle()
              currentTablePos = -1
              currentColumnIndex = -1
              onColumnNodeChange?.({ editor, tablePos: -1, columnIndex: -1, rect: null })

              return false
            }
            return false
          },
          mouseleave(_, e) {
            if (locked) {
              return false
            }
            if (e.target && !wrapper.contains(e.relatedTarget as HTMLElement)) {
              hideHandle()

              currentColumnIndex = -1
              currentTablePos = -1

              onColumnNodeChange?.({ editor, tablePos: -1, columnIndex: -1, rect: null })
            }
            return false
          },
          mousemove(view, e) {
            if (!element || locked) return false


            if (rafId) {
              return false
            }

            rafId = requestAnimationFrame(() => {
              rafId = null

              const ctx = getTableContext(view, e)
              if (!ctx) return

              const { cell, table } = ctx
              const tableContainer = view.nodeDOM(table.pos) as HTMLElement | null
              if (!tableContainer) return false

              const { map, columnIndex } = getCellIndices(
                table.node,
                cell.pos,
                table.pos
              )
              const rect = getColumnDOMRect(map, table.pos, columnIndex, view)

              if (currentTablePos !== table.pos || currentColumnIndex !== columnIndex) {
                currentTablePos = table.pos
                currentColumnIndex = columnIndex

                onColumnNodeChange?.({ editor, tablePos: table.pos, columnIndex, rect })

                if (rect) {
                  repositionDragHandle(rect)
                }

                showHandle()
              }
            })
            return false
          }
        }
      }
    })
  }
}
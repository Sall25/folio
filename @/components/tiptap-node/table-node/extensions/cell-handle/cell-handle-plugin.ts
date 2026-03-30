import { computePosition, type ComputePositionConfig, type VirtualElement } from "@floating-ui/dom";
import type { Editor } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { getTableContext } from "../utils/get-table-context";

export function removeNode(node: HTMLElement) {
  node.parentNode?.removeChild(node)
}

export interface CellHandlePluginProps {
  pluginKey?: PluginKey | string
  editor: Editor
  element: HTMLElement
  onCellNodeChange?: (data: { editor: Editor, cellPos: number, rect: DOMRect | null }) => void
  computePositionConfig?: ComputePositionConfig
}

export const cellHandlePluginDefaultKey = new PluginKey('cellHandlePluginDefaultKey')

export const CellHandlePlugin = ({
  pluginKey,
  editor,
  element,
  onCellNodeChange,
  computePositionConfig
}: CellHandlePluginProps) => {

  const wrapper = document.createElement('div')

  let locked = false
  let currentCellPos = -1
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

  function repositionHandle(rect: DOMRect) {
    const virtual: VirtualElement = {
      getBoundingClientRect: () => rect
    }

    computePosition(virtual, element, computePositionConfig).then(val => {
      Object.assign(element.style, {
        position: val.strategy,
        left: `${val.x}px`,
        top: `${val.y}px`
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
          const isLocked = tr.getMeta('lockCellHandle')
          const hide = tr.getMeta('hideCellHandle')

          if (isLocked !== undefined) locked = isLocked

          if (hide) {
            hideHandle()
            currentCellPos = -1
            onCellNodeChange?.({ editor, cellPos: -1, rect: null })
          }

          return value
        }
      },

      view: () => {
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

            if (view.state.doc.eq(prev.doc) || currentCellPos === -1) return

            const dom = view.nodeDOM(currentCellPos) as HTMLElement | null
            if (!dom) return

            const rect = dom.getBoundingClientRect()
            onCellNodeChange?.({ editor, cellPos: currentCellPos, rect })

            if (rect) repositionHandle(rect)
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
          mousedown(view, event) {
            const ctx = getTableContext(view, event)
            if (!ctx) return false

            if (!element || locked) return false

            if (rafId) {
              return false
            }

            rafId = requestAnimationFrame(() => {
              rafId = null

              const { cell } = ctx
              if (cell.node.type.name === 'tableCell') {
                console.log('tableCell')
              }
              if (cell.pos !== -1) {
                currentCellPos = cell.pos
                const dom = view.nodeDOM(currentCellPos) as HTMLElement | null
                if (!dom) return false

                const rect = dom.getBoundingClientRect()
                onCellNodeChange?.({ editor, cellPos: cell.pos, rect })
                if (rect) repositionHandle(rect)
                showHandle()
              }
            })

          },
          mouseleave(_, e) {
            if (!wrapper.contains(e.relatedTarget as HTMLElement)) {
              hideHandle()
              currentCellPos = -1
              onCellNodeChange?.({ editor, cellPos: -1, rect: null })
            }
            return false
          }
        }
      }
    })
  }
}
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { type GutterKey } from "./types";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export const gutterPluginKey = new PluginKey<GutterKey>('gutterPlugin');

export const GutterPlugin = new Plugin({
  key: gutterPluginKey,

  state: {
    init: () => ({ pos: null, from: null, to: null, rect: null }),
    apply(tr, prev) {
      const meta = tr.getMeta(gutterPluginKey)

      // If we received a fresh calculation from mousemove, use it
      if (meta) {
        return meta
      }

      // Otherwise we must map the previous positions forward
      if (!prev.pos || !prev.from || !prev.to) return prev

      const mappedFrom = tr.mapping.map(prev.from)
      const mappedTo = tr.mapping.map(prev.to)
      const mappedPos = tr.mapping.map(prev.pos)

      return {
        ...prev,
        from: mappedFrom,
        to: mappedTo,
        pos: mappedPos,
      }
    }

  },

  props: {
    handleDOMEvents: {
      mousemove: (view, event) => {
        const coords = view.posAtCoords({ left: event.clientX, top: event.clientY })
        if (!coords) return false

        const $pos = view.state.doc.resolve(coords.pos)

        let p: number | null = null
        let from: number | null = null
        let to: number | null = null

        for (let d = $pos.depth; d > 0; d--) {
          const node = $pos.node(d)
          if (!node.isBlock) continue

          // skip unselectable nodes
          if (['tableCell', 'tableHeader', 'tableRow', 'listItem'].includes(node.type.name)) continue

          // skip nodes inside tables or list items
          let selectable = true
          for (let depth = d - 1; depth > 0; depth--) {
            const parent = $pos.node(depth)
            if (['table', 'listItem'].includes(parent.type.name)) {
              selectable = false
              break
            }
          }
          if (!selectable) continue

          // use ProseMirror’s real boundary
          const pos = $pos.before(d)
          const realNode = view.state.doc.nodeAt(pos)
          if (!realNode) continue

          p = pos
          from = pos
          to = pos + realNode.nodeSize
          break
        }

        if (p == null || from == null || to == null) return false

        // VERY IMPORTANT: nodeDOM can return a Text node or null
        const dom = view.nodeDOM(from)
        if (!(dom instanceof HTMLElement)) return false

        const rect = dom.getBoundingClientRect()

        view.dispatch(
          view.state.tr.setMeta(gutterPluginKey, { pos: p, rect, from, to })
        )

        return false
      },

      mouseleave: (view) => {
        view.dispatch(
          view.state.tr.setMeta(gutterPluginKey, { pos: null, from: null, to: null, rect: null })
        )
      },
    }
  }
})

export const nodeSelectionPluginKey = new PluginKey<{ from: number, to: number }>('nodeSelectionPlugin')

export const NodeSelectionPlugin = new Plugin({
  key: nodeSelectionPluginKey,

  state: {
    init: () => DecorationSet.empty,
    apply(tr, value) {
      const meta = tr.getMeta(nodeSelectionPluginKey)

      if (meta === null) {
        // explicit clear
        return DecorationSet.empty
      }

      if (!meta) {
        return value.map(tr.mapping, tr.doc)
      }

      const { from, to } = meta

      return DecorationSet.create(tr.doc, [
        Decoration.node(from, to, { class: 'pm-selected-node' }),
      ])
    }
  },
  props: {
    decorations(state) {
      return this.getState(state)
    },
  }
})
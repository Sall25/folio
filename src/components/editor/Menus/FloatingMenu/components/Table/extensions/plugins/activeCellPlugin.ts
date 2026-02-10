import { Plugin, PluginKey } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'


export const activeCellPlugin = new Plugin({
  key: new PluginKey('activeCellPlugin'),

  state: {
    init: () => DecorationSet.empty,
    apply(tr, oldState) {
      const { selection, doc } = tr
      const decorations: Decoration[] = []

      const { from } = selection
      const $pos = doc.resolve(from)
      const depth = $pos.depth
      if (depth <= 1) return oldState.map(tr.mapping, doc)

      const cell = $pos.node(-1)
      const pos = $pos.before(-1)

      if (cell.type.name === 'tableCell' || cell.type.name === 'tableHeader') {

        decorations.push(
          Decoration.node(pos, pos + cell.nodeSize, { class: 'active-cell' })
        )
        return DecorationSet.create(doc, decorations)
      }


      return oldState.map(tr.mapping, doc)

    },
  },

  props: {
    decorations(state) {
      return this.getState(state)
    },
  },
})

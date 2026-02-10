
import { Plugin, PluginKey } from 'prosemirror-state'


export const preventTextSelectionDuringTableDrag = new Plugin({
  key: new PluginKey('preventTextSelectionDuringTableDrag'),

  props: {
    handleDOMEvents: {
      selectstart(view, event) {
        const target = event.target as HTMLElement | null
        if (!target) return false

        // If selection starts inside a table cell → block
        if (target.closest('td, th')) {
          event.preventDefault()
          return true
        }

        return false
      },
    },
  },
})

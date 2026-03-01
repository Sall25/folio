import { Extension } from "@tiptap/core";
import {
  insertLineAfter as insertLineAfterCmd
} from "../commands/insertLineAfter";
import {
  hideDragHandle as hideDragHandleCmd
} from '../commands/hideDragHandle'
import {
  clearSelection as clearSelectionCmd
} from '../commands/clearSelection'
import {
  decorateSelection as decorateSelectionCmd
} from "../commands/decorateSelection";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export const GlobalCommands = Extension.create({
  name: 'globalCommandsExtension',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('decorateSelectionPlugin'),
        state: {
          init: () => DecorationSet.empty,

          apply(tr, value) {
            const meta = tr.getMeta('decorateSelection')
            if (meta) {
              const { from, to } = meta
              console.log('from', from, 'to', to)
              return DecorationSet.create(
                tr.doc,
                [
                  Decoration.inline(from, to, { class: 'pm-selection-decoration' })
                ]
              )
            }

            // If the user moved the cursor → remove it
            if (tr.selectionSet) {
              return DecorationSet.empty
            }

            return value.map(tr.mapping, tr.doc)
          },
        },
        props: {
          decorations(state) {
            return this.getState(state)
          },
        }
      })
    ]
  },

  addCommands() {
    return {
      insertLineAfter(pos) {
        return insertLineAfterCmd(pos)
      },
      hideDragHandle() {
        return hideDragHandleCmd()
      },
      clearSelection(pos) {
        return clearSelectionCmd(pos)
      },
      decorateSelection(from, to) {
        return decorateSelectionCmd(from, to)
      },
    }
  }
})
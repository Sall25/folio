import Heading from '@tiptap/extension-heading'
import { Plugin } from '@tiptap/pm/state'
import { nanoid } from 'nanoid'

export const HeadingWithId = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      id: {
        default: null,
        parseHTML(element) {
          return element.getAttribute('id')
        },
        renderHTML(attributes) {
          if (!attributes.id) {
            return {}
          }
          return { id: attributes.id }
        },
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction(transactions, oldState, newState) {
          if (!transactions.some(tr => tr.docChanged)) {
            return null
          }

          const tr = newState.tr
          let modified = false

          newState.doc.descendants((node, pos) => {
            if (
              node.type.name === 'heading' &&
              node.attrs.id == null
            ) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                id: nanoid(8),
              })
              modified = true
            }
          })

          return modified ? tr : null
        }

      }),
    ]
  },
})

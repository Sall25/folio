import { Extension } from '@tiptap/core'

export const TextBlockStyle = Extension.create({
  name: 'textBlockStyle',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading', 'blockquote', 'codeBlock'],
        attributes: {
          color: {
            default: null,
            parseHTML: el => el.getAttribute('data-color'),
            renderHTML: attrs => {
              if (!attrs.color) return {}
              return {
                'data-color': attrs.color,
                style: `color: ${attrs.color}`,
              }
            },
          },

          backgroundColor: {
            default: null,
            parseHTML: el => el.getAttribute('data-bg'),
            renderHTML: attrs => {
              if (!attrs.backgroundColor) return {}
              return {
                'data-bg': attrs.backgroundColor,
                style: `background-color: ${attrs.backgroundColor}`,
              }
            },
          },

          textAlign: {
            default: null,
            parseHTML: el => el.style.textAlign || null,
            renderHTML: attrs => {
              if (!attrs.textAlign) return {}
              return {
                style: `text-align: ${attrs.textAlign}`,
              }
            },
          },
        },
      },
    ]
  },
})

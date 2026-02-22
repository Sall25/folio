import { Extension } from "@tiptap/core";

export const DocExtension = Extension.create({
  name: 'docExtension',

  addGlobalAttributes() {
    return [
      {
        types: ['heading', 'paragraph', 'blockquote', 'table', 'bulletList', 'orderedList'],
        attributes: {
          color: {
            default: null,
            renderHTML(attributes) {
              if (!attributes.color) {
                return {}
              }
              return {
                'data-color': attributes.color,
                style: `color: ${attributes.color}`
              }
            },
            parseHTML(element) {
              return element.getAttribute('data-color')
            },
          },
          background: {
            default: null,
            renderHTML(attributes) {
              if (!attributes.background) {
                return {}
              }
              return {
                'data-background': attributes.background,
                style: `background: ${attributes.background}`
              }
            },
            parseHTML(element) {
              return element.getAttribute('data-background')
            },
          },
          textAlign: {
            default: null,
            renderHTML(attributes) {
              if (!attributes.textAlign) {
                return {}
              }
              return {
                'data-textAlign': attributes.textAlign,
                style: `text-align: ${attributes.textAlign}`
              }
            },
            parseHTML(element) {
              return element.getAttribute('data-textAlign')
            },
          }
        }
      }
    ]
  },
})
import { mergeAttributes, Node, ReactNodeViewRenderer } from "@tiptap/react";
import { SidebarBlockView } from "./SidebarBlockView";

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    sidebarBlock: {
      insertSidebar: () => ReturnType;
    }
  }
}

export const SidebarBlock = Node.create({
  name: 'sidebarBlock',

  group: 'block',
  content: 'sidebarItem+',
  selectable: true,
  draggable: true,
  atom: true,

  addAttributes() {
    return {
      title: { default: '' }
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="sidebar-block"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'sidebar-block'
      }),
      0]
  },

  addNodeView() {
    return ReactNodeViewRenderer(SidebarBlockView)
  },

  addCommands() {
    return {
      insertSidebar: () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { title: 'Sidebar' },
            content: [
              {
                type: 'sidebarItem',
                attrs: { type: 'doc' },
                content: [{ type: 'text', text: 'Introduction' }]
              },
              {
                type: 'sidebarItem',
                attrs: { type: 'doc' },
                content: [{ type: 'text', text: 'Getting Started' }]
              }
            ],
          })
        }
    }
  },
});
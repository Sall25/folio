import { mergeAttributes, Node } from "@tiptap/react";

export const SidebarItem = Node.create({
  name: 'sidebarItem',
  group: 'block',
  content: 'text*',

  addOptions() {
    return {
      class: {}
    }
  },

  addAttributes() {
    return {
      type: { default: 'doc' }
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type = "sidebar-item"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'sidebar-item',
        class: this.options.class
      }),
      0]
  },
});

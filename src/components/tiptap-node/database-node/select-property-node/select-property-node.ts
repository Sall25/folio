import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { SelectPropertyNodeView } from "./select-property-node-view.js";

export interface SelectOption {
  id: string;
  label: string;
  color: string;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    selectProperty: {
      insertSelectProperty: (attrs?: {
        options?: SelectOption[];
        selected?: SelectOption | null;
      }) => ReturnType;
    };
  }
}

export const SelectPropertyNode = Node.create({
  name: "selectProperty",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      nodeId: { default: null },
      selected: { default: null }, // SelectOption | null
      options: { default: [] }, // SelectOption[]
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="select-property"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { "data-type": "select-property" }),
    ];
  },

  addCommands() {
    return {
      insertSelectProperty:
        (attrs = {}) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(SelectPropertyNodeView);
  },
});

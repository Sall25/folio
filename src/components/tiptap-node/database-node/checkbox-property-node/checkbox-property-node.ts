import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { CheckboxPropertyNodeView } from "./checkbox-property-node-view";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    checkboxProperty: {
      insertCheckboxProperty: (attrs?: {
        checked?: boolean;
        label?: string;
      }) => ReturnType;
    };
  }
}

export const CheckboxPropertyNode = Node.create({
  name: "checkboxProperty",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      nodeId:  { default: null },
      checked: { default: false },
      label:   { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="checkbox-property"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { "data-type": "checkbox-property" }),
    ];
  },

  addCommands() {
    return {
      insertCheckboxProperty:
        (attrs = {}) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(CheckboxPropertyNodeView);
  },
});
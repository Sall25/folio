import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { NumberPropertyNodeView } from "./number-property-node-view.js";

export type NumberFormat =
  | "number"
  | "dollar"
  | "euro"
  | "pound"
  | "percent"
  | "decimal"
  | "compact";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    numberProperty: {
      insertNumberProperty: (attrs?: {
        value?: number | null;
        format?: NumberFormat;
      }) => ReturnType;
    };
  }
}

export const NumberPropertyNode = Node.create({
  name: "numberProperty",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      nodeId: { default: null },
      value: { default: null }, // number | null
      format: { default: "number" }, // NumberFormat
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="number-property"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { "data-type": "number-property" }),
    ];
  },

  addCommands() {
    return {
      insertNumberProperty:
        (attrs = {}) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(NumberPropertyNodeView);
  },
});

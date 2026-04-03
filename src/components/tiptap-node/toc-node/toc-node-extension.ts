// toc-node-extension.ts
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { TocNodeView } from "./toc-node-view";
import "./toc-node.scss";

export interface TocNodeOptions {
  topOffset: number;
  maxShowCount: number;
  showTitle: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    tocNode: {
      insertTocNode: (attrs?: Partial<TocNodeOptions>) => ReturnType;
    };
  }
}

export const TocNode = Node.create<TocNodeOptions>({
  name: "tocNode",
  group: "block",
  atom: true, // treated as a single unit, not editable inside

  addOptions() {
    return {
      topOffset: 0,
      maxShowCount: 20,
      showTitle: true,
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      topOffset: { default: this.options.topOffset },
      maxShowCount: { default: this.options.maxShowCount },
      showTitle: { default: this.options.showTitle },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="toc-node"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(
        { "data-type": "toc-node" },
        this.options.HTMLAttributes,
        HTMLAttributes,
      ),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TocNodeView);
  },

  addCommands() {
    return {
      insertTocNode:
        (attrs = {}) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },
    };
  },
});

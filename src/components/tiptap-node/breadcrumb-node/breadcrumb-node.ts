import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import "./breadcrumb-node.scss";
import { BreadcrumbNodeView } from "./breadcrumb-node-view";

export interface BreadcrumbOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    breadcrumb: {
      /** Insert a breadcrumb block showing the current page's location. */
      insertBreadcrumb: () => ReturnType;
    };
  }
}

export const BreadcrumbNode = Node.create<BreadcrumbOptions>({
  name: "breadcrumb",
  group: "block",
  atom: true,
  selectable: false,
  draggable: false,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="breadcrumb"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "breadcrumb",
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(BreadcrumbNodeView);
  },

  addCommands() {
    return {
      insertBreadcrumb:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name }),
    };
  },
});

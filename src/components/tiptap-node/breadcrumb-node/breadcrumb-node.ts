import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { BreadcrumbNodeView } from "./breadcrumb-node-view";
import type { ID } from "src/types";

export interface BreadcrumbItem {
  label: string;
  iconName?: string;
  locked?: boolean;
  pageId?: ID;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    breadcrumb: {
      insertBreadcrumb: (items: BreadcrumbItem[]) => ReturnType;
    };
  }
}

export const BreadcrumbNode = Node.create({
  name: "breadcrumb",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      items: {
        default: [],
        parseHTML: (el) => {
          try {
            return JSON.parse(el.getAttribute("data-items") ?? "[]");
          } catch {
            return [];
          }
        },
        renderHTML: (attrs) => ({
          "data-items": JSON.stringify(attrs.items),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-type='breadcrumb']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "breadcrumb" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(BreadcrumbNodeView);
  },

  addCommands() {
    return {
      insertBreadcrumb:
        (items) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { items },
          });
        },
    };
  },
});

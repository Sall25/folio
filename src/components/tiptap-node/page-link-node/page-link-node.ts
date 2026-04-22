import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { PageLinkNodeView } from "./page-link-node-view.js";
import type { Page } from "src/components/tiptap-templates/simple/types.js";

interface PageLinkOptions {
  onNavigate: (pageId: string) => void;
}

interface PageLinkStorage {
  pages: Page[];
}

declare module "@tiptap/core" {
  interface Options {
    pageLink: PageLinkOptions;
  }
}

declare module "@tiptap/core" {
  interface Storage {
    pageLink: PageLinkStorage;
  }
}

export const PageLinkNode = Node.create<PageLinkOptions, PageLinkStorage>({
  name: "pageLink",
  group: "block",
  atom: true, // treated as a single unit, not editable inside

  addOptions() {
    return {
      onNavigate() {},
    };
  },
  addStorage() {
    return {
      pages: [],
    };
  },
  addAttributes() {
    return {
      pageId: {
        default: null,
      },
      parentId: {
        default: null,
      },
      title: {
        default: null,
      },
      nodeId: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="page-link"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "page-link" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PageLinkNodeView);
  },
});

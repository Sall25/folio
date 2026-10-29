import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { BookmarkNodeView } from "./bookmark-node-view";

export interface BookmarkAttrs {
  url: string | null;
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
  caption: string;
  /** "card": title, description and image; "compact": one line. */
  layout: "card" | "compact";
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    bookmark: {
      insertBookmark: (url?: string) => ReturnType;
    };
  }
}

export const BookmarkNode = Node.create({
  name: "bookmark",
  group: "block",
  content: "block*",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      url: { default: null },
      title: { default: null },
      description: { default: null },
      image: { default: null },
      favicon: { default: null },
      caption: { default: "" },
      layout: { default: "card" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="bookmark"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "bookmark" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(BookmarkNodeView);
  },

  addPasteRules() {
    return [
      {
        // Only a pasted link on its own: a link inside pasted text stays a
        // link in the text instead of splitting it with a bookmark.
        find: /^https?:\/\/[^\s]+$/g,
        handler: ({ match, chain }) => {
          chain().insertBookmark(match[0]).run();
        },
      },
    ];
  },

  addCommands() {
    return {
      insertBookmark:
        (url) =>
        ({ commands }) =>
          commands.insertContent({
            type: "bookmark",
            attrs: { url: url ?? null },
          }),
    };
  },
});

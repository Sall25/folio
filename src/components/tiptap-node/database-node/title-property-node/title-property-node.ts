import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { TitlePropertyNodeView } from "./title-property-node-view";

export interface TitlePropertyOptions {
  onOpen: (pageId: number) => void;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    titleProperty: {
      insertTitleProperty: (attrs: {
        pageId: number;
        parentId: number;
        title: string;
        icon?: string;
      }) => ReturnType;
    };
  }
}

export const TitlePropertyNode = Node.create<TitlePropertyOptions>({
  name: "titleProperty",
  group: "inline",
  inline: true,
  atom: true,

  addOptions() {
    return {
      onOpen: () => {},
    };
  },

  addAttributes() {
    return {
      pageId: { default: null },
      title: { default: "Untitled" },
      parentId: { default: null },
      icon: { default: null },
      nodeId: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="title-property"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { "data-type": "title-property" }),
    ];
  },

  addCommands() {
    return {
      insertTitleProperty:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs,
          }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(TitlePropertyNodeView);
  },
});

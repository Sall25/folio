import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { CalloutNodeView } from "./callout-node-view";
import type { CalloutAttrs } from "./types";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      insertCallout: (options?: CalloutAttrs) => ReturnType;
    };
  }
}

export const CalloutExtension = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  draggable: true,

  addAttributes() {
    return {
      color: { default: null },
      iconName: { default: "🔔" },
      target: { default: "Emoji" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "callout" }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutNodeView);
  },

  addCommands() {
    return {
      insertCallout:
        (options = { color: null, iconName: null, target: null }) =>
        ({ commands }) =>
          commands.insertContent({
            type: "callout",
            attrs: {
              color: options.color ?? null,
              iconName: options.iconName ?? "🔔",
              target: options.target ?? "Emoji",
            },
            content: [{ type: "paragraph" }],
          }),
    };
  },

  // Pressing Enter at the end of the last block exits the callout
  addKeyboardShortcuts() {
    return {
      "Mod-Enter": () => this.editor.commands.exitCode(),
    };
  },
});

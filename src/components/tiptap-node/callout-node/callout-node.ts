import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { CalloutNodeView } from "./callout-node-view";
import type { CalloutColor } from "./types";
import { DEFAULT_EMOJI, DEFAULT_COLOR } from "./config";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      insertCallout: (options?: {
        emoji?: string;
        color?: CalloutColor;
      }) => ReturnType;
      setCalloutColor: (color: CalloutColor) => ReturnType;
      setCalloutEmoji: (emoji: string) => ReturnType;
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
      emoji: { default: DEFAULT_EMOJI },
      color: { default: DEFAULT_COLOR },
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
        (options = {}) =>
        ({ commands }) =>
          commands.insertContent({
            type: "callout",
            attrs: {
              emoji: options.emoji ?? DEFAULT_EMOJI,
              color: options.color ?? DEFAULT_COLOR,
            },
            content: [{ type: "paragraph" }],
          }),

      setCalloutColor:
        (color) =>
        ({ commands }) =>
          commands.updateAttributes("callout", { color }),

      setCalloutEmoji:
        (emoji) =>
        ({ commands }) =>
          commands.updateAttributes("callout", { emoji }),
    };
  },

  // Pressing Enter at the end of the last block exits the callout
  addKeyboardShortcuts() {
    return {
      "Mod-Enter": () => this.editor.commands.exitCode(),
    };
  },
});

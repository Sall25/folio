import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { CalloutNodeView } from "./callout-node-view";
import type { CalloutAttrs } from "./types";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      insertCallout: (options?: Partial<CalloutAttrs>) => ReturnType;
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
      // null → default grey highlight (preserves existing callouts).
      // "transparent" → flexible / container-style callout.
      backgroundColor: { default: null },
      iconName: { default: "🔔" },
      target: { default: "Emoji" },
      // Whether the icon slot is shown at all. false → iconless, content
      // flush-left (the "just a transparent container" look).
      showIcon: { default: true },
      // Optional 1px border, for the bordered-container look.
      bordered: { default: false },
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
        ({ commands }) => {
          const showIcon = options.showIcon ?? true;
          return commands.insertContent({
            type: "callout",
            attrs: {
              color: options.color ?? null,
              backgroundColor: options.backgroundColor ?? null,
              // Iconless callouts start with no icon name so nothing renders
              // even if showIcon is later flipped on without a pick.
              iconName: options.iconName ?? (showIcon ? "🔔" : null),
              target: options.target ?? "Emoji",
              showIcon,
              bordered: options.bordered ?? false,
            },
            content: [{ type: "paragraph" }],
          });
        },
    };
  },

  // Pressing Enter at the end of the last block exits the callout
  addKeyboardShortcuts() {
    return {
      "Mod-Enter": () => this.editor.commands.exitCode(),
    };
  },
});

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

  // Mod-Enter: Inserts an empty paragraph after the callout and moves the cursor there.
  // Enter: On an empty last paragraph of the callout, exits the callout.
  addKeyboardShortcuts() {
    return {
      "Mod-Enter": ({ editor }) => {
        if (!editor.isActive(this.name)) return false;

        const { state } = editor;
        const { $to } = state.selection; // Use $to in case of an active text selection

        // Find the boundary of the callout node we're currently inside
        let depth = $to.depth;
        while (depth > 0 && $to.node(depth).type.name !== this.name) {
          depth--;
        }
        if (depth === 0) return false;

        const posAfter = $to.after(depth);

        // Break out of the callout by appending a new paragraph right after it
        return editor
          .chain()
          .insertContentAt(posAfter, { type: "paragraph" })
          .focus(posAfter + 1)
          .run();
      },

      Enter: ({ editor }) => {
        if (!editor.isActive(this.name)) return false;

        const { state } = editor;
        const { $from, empty } = state.selection;

        // Only trigger the exit if the cursor is resting alone in an empty paragraph
        if (
          !empty ||
          $from.parent.type.name !== "paragraph" ||
          $from.parent.textContent.length > 0
        ) {
          return false;
        }

        let depth = $from.depth;
        while (depth > 0 && $from.node(depth).type.name !== this.name) {
          depth--;
        }
        if (depth === 0) return false;

        // Verify if we are sitting in the very last block of the callout
        const isAtEnd = $from.after() === $from.after(depth) - 1;
        if (!isAtEnd) return false;

        const calloutNode = $from.node(depth);
        if (calloutNode.childCount === 1) {
          // Edge case: If it's the ONLY block in the callout, clear the callout entirely
          return editor.commands.lift(this.name);
        }

        const posAfter = $from.after(depth);
        const start = $from.before();
        const end = $from.after();

        // Standard case: Delete the trailing empty paragraph, then insert a new one outside
        return editor
          .chain()
          .deleteRange({ from: start, to: end })
          // posAfter shifts by 2 because deleting an empty paragraph removes 2 tokens
          .insertContentAt(posAfter - 2, { type: "paragraph" })
          .focus(posAfter - 1)
          .run();
      },
    };
  },
});

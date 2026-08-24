import { Node, mergeAttributes } from "@tiptap/core";
import "./title-node.scss";

export const TitleNode = Node.create({
  name: "title",
  group: "block",
  content: "inline*",
  defining: true,
  isolating: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => {
        const { selection } = editor.state;
        const { $anchor, empty } = selection;

        // Cursor at the very start of the title with nothing selected →
        // block backspace so it can't delete/merge the title away.
        if (
          empty &&
          $anchor.parent.type.name === this.name &&
          $anchor.parentOffset === 0
        ) {
          return true; // swallow — do nothing
        }
        return false; // normal backspace otherwise
      },

      // Also block Delete at title start merging the next block up into title
      // deletion edge cases, and select-all deletion is handled by schema below.
    };
  },

  parseHTML() {
    return [{ tag: "h1[data-type='title']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["h1", mergeAttributes(HTMLAttributes, { "data-type": "title" }), 0];
  },
});

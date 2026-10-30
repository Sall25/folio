import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { BlockRefView } from "./block-ref-view";

// A live view of a block from another page (or another place in this one),
// inserted by dragging a pin into the page and choosing "Live view"
// (src/features/editor/pins/pin-drop.ts). It stores only where the block is
// (page id + block id) and draws the original read-only, so it follows the
// original's edits. "Turn into copy" in its block menu replaces it with the
// block itself.

export const BlockRefExtension = Node.create({
  name: "blockRef",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      pageId: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-page-id"),
        renderHTML: (attrs: Record<string, unknown>) =>
          attrs.pageId ? { "data-page-id": attrs.pageId } : {},
      },
      blockId: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-block-id"),
        renderHTML: (attrs: Record<string, unknown>) =>
          attrs.blockId ? { "data-block-id": attrs.blockId } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="block-ref"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "block-ref" }),
    ];
  },

  addNodeView() {
    const render = ReactNodeViewRenderer(BlockRefView);
    // As for the Pomodoro: let mousemove through so the drag handle
    // reaches this atom block; everything else keeps Tiptap's handling.
    return (props) => {
      const view = render(props);
      if ("stopEvent" in view && typeof view.stopEvent === "function") {
        const stopEvent = view.stopEvent.bind(view);
        view.stopEvent = (event: Event) =>
          event.type === "mousemove" ? false : stopEvent(event);
      }
      return view;
    };
  },
});

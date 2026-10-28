import type { NodeViewRenderer } from "@tiptap/core";

// Tiptap's node view stops every mousemove inside a block with no editable
// content (an atom), and the drag handle follows mousemove through
// ProseMirror, so it never reached those blocks. This lets mousemove
// through; every other event keeps Tiptap's own handling.
export function passMousemove(render: NodeViewRenderer): NodeViewRenderer {
  return (props) => {
    const view = render(props);
    if ("stopEvent" in view && typeof view.stopEvent === "function") {
      const stopEvent = view.stopEvent.bind(view);
      view.stopEvent = (event: Event) =>
        event.type === "mousemove" ? false : stopEvent(event);
    }
    return view;
  };
}
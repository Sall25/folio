import { Plugin } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { Extension } from "@tiptap/core";

// ── Plugin ─────────────────────────────────────────────────────────────────

const tallCursorPlugin = new Plugin({
  view(editorView: EditorView) {
    const cursor = document.createElement("div");
    cursor.className = "custom-cursor";
    cursor.setAttribute("aria-hidden", "true");

    // Find the nearest positioned ancestor to use as the coordinate anchor.
    // We walk up from view.dom until we find one with position != static,
    // then append the cursor there so absolute positioning works correctly.
    function getAnchor(): HTMLElement {
      let el: HTMLElement | null = editorView.dom.parentElement;
      while (el) {
        const pos = window.getComputedStyle(el).position;
        if (pos === "relative" || pos === "absolute" || pos === "fixed") {
          return el;
        }
        el = el.parentElement;
      }
      return document.body;
    }

    const anchor = getAnchor();
    anchor.appendChild(cursor);

    function update(view: EditorView) {
      const { state } = view;

      if (!view.hasFocus()) {
        cursor.style.display = "none";
        return;
      }

      if (!state.selection.empty) {
        cursor.style.display = "none";
        return;
      }

      const { from } = state.selection;

      try {
        const coords = view.coordsAtPos(from);
        const anchorRect = anchor.getBoundingClientRect();

        const lineHeight = coords.bottom - coords.top;
        const extraPadding = Math.round(lineHeight * 0.15);

        cursor.style.display = "block";
        cursor.style.left = `${coords.left - anchorRect.left + anchor.scrollLeft}px`;
        cursor.style.top = `${coords.top - anchorRect.top + anchor.scrollTop - extraPadding}px`;
        cursor.style.height = `${lineHeight + extraPadding * 2}px`;
      } catch {
        cursor.style.display = "none";
      }
    }

    return {
      update,
      destroy() {
        cursor.remove();
      },
    };
  },
});

// ── Tiptap Extension ───────────────────────────────────────────────────────

export const TallCursor = Extension.create({
  name: "tallCursor",

  addProseMirrorPlugins() {
    return [tallCursorPlugin];
  },
});

import type { Editor } from "@tiptap/core";

// Where pinned blocks are drawn: the rail beside the page ("side") and the
// slot in the top bar ("top"). Each registers its element here when it
// mounts; a pinned block's node view draws itself there (a React portal).
// The top bar sits outside the editor, hence a store rather than context.

export type PinPlace = "side" | "top";

/** Blocks that can be pinned (their node views draw the pinned copy). */
export const PINNABLE_TYPES = ["pomodoro", "tocNode"];

const targets: Record<PinPlace, HTMLElement | null> = {
  side: null,
  top: null,
};
const listeners = new Set<() => void>();

export const pinTargets = {
  set(place: PinPlace, el: HTMLElement | null) {
    if (targets[place] === el) return;
    targets[place] = el;
    listeners.forEach((l) => l());
  },
  get: (place: PinPlace) => targets[place],
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/** Only the page's own editor pins (not a peek or the landing). */
export function isPageEditor(editor: Editor): boolean {
  try {
    return !!editor.view.dom.closest(".simple-editor-main");
  } catch {
    return false;
  }
}

/** Scroll the page to where the block lives. */
export function scrollToBlock(editor: Editor, pos: number | undefined) {
  if (pos == null) return;
  const dom = editor.view.nodeDOM(pos);
  if (dom instanceof HTMLElement) {
    dom.scrollIntoView({ block: "center", behavior: "smooth" });
  }
}

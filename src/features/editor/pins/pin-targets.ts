import type { Editor } from "@tiptap/core";

// Where pinned blocks are drawn: the rail beside the page ("side") and the
// slot in the top bar ("top"). Each registers its element here when it
// mounts; a pinned block's node view draws itself there (a React portal).
// The top bar sits outside the editor, hence a store rather than context.

export type PinPlace = "side" | "top";

/** Blocks that MOVE into the rail (their node views draw themselves there). */
export const PORTAL_TYPES = ["pomodoro", "tocNode"];
/** Every other block that can be pinned: it stays in the page and the rail
 *  shows a mirror of it (pin-mirrors.tsx). Not pinnable: the title, columns
 *  (pin what's inside them), and inline databases (for now). */
export const MIRROR_TYPES = [
  "paragraph",
  "heading",
  "blockquote",
  "bulletList",
  "orderedList",
  "taskList",
  "codeBlock",
  "horizontalRule",
  "callout",
  "appendix",
  "image",
  "video",
  "audio",
  "file",
  "bookmark",
  "mathBlock",
  "pageLink",
  "tableWrapper",
];
/** Every block that can be pinned. */
export const PINNABLE_TYPES = [...PORTAL_TYPES, ...MIRROR_TYPES];

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

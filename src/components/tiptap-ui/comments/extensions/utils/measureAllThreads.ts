import type { Editor } from "@tiptap/core";
import type { MeasuredThread, Thread } from "src/types";

export function measureAllThreads(
  editor: Editor,
  threads: Thread[],
): MeasuredThread[] {
  const scrollContainer = document.querySelector(".simple-editor-main");
  const containerTop = scrollContainer?.getBoundingClientRect().top ?? 0;
  const docSize = editor.state.doc.content.size;

  return threads.flatMap((t) => {
    if (!t.anchor) return [];
    // Clamp the anchor into the current document. On initial load (Yjs still
    // hydrating) or right after a remount, the stored anchor can exceed the
    // rendered doc; coordsAtPos then throws.
    const fromPos = Math.max(0, Math.min(t.anchor.from, docSize));

    let top: number;
    try {
      ({ top } = editor.view.coordsAtPos(fromPos));
    } catch {
      // Not renderable this tick — KEEP the thread with a fallback position
      // instead of dropping it, so the card doesn't vanish. The next reflow
      // (fired on editor-ready / doc change) corrects the real position.
      return [
        {
          id: t.id,
          from: t.anchor.from,
          to: t.anchor.to,
          anchorTop: 0,
          height: 150,
        },
      ] as MeasuredThread[];
    }

    const el = document.querySelector(
      `[data-thread-list-item-id="${t.id}"]`,
    ) as HTMLElement | null;

    const height = el?.offsetHeight ?? 150;

    return {
      id: t.id,
      from: t.anchor.from,
      to: t.anchor.to,
      anchorTop: top - containerTop,
      height,
    };
  });
}

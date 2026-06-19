import type { Editor } from "@tiptap/core";
import type { MeasuredThread, Thread } from "src/types";

export function measureAllThreads(
  editor: Editor,
  threads: Thread[],
): MeasuredThread[] {
  const scrollContainer = document.querySelector(".simple-editor-main");
  const scrollTop = scrollContainer?.scrollTop ?? window.scrollY;
  const containerTop = scrollContainer?.getBoundingClientRect().top ?? 0;

  // if not fixed use map
  return threads.flatMap((t) => {
    let top: number;
    try {
      ({ top } = editor.view.coordsAtPos(t.anchor.from));
    } catch {
      return [] as MeasuredThread[];
    }

    console.log({
      top,
      containerTop,
      scrollTop,
      anchorTop: top - containerTop + scrollTop,
    });
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

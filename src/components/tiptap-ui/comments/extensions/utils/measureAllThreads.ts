import type { Editor } from "@tiptap/core";
import type { MeasuredThread, Thread } from "../../types";

export function measureAllThreads(
  editor: Editor,
  threads: Thread[],
): MeasuredThread[] {
  const scrollContainer = document.querySelector(".simple-editor-main");
  const scrollTop = scrollContainer?.scrollTop ?? window.scrollY;
  const containerTop = scrollContainer?.getBoundingClientRect().top ?? 0;

  return threads.map((t) => {
    const { top } = editor.view.coordsAtPos(t.anchor.from);
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

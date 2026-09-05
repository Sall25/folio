import { useEffect } from "react";

export function useDatabaseAlign(containerSelector = ".simple-editor-center") {
  useEffect(() => {
    const align = () => {
      const block = document.querySelector<HTMLElement>(".top-level-block");
      if (!block) return;
      const blockLeft = block.getBoundingClientRect().left;

      document.querySelectorAll<HTMLElement>(".db-node").forEach((node) => {
        const container = node.querySelector<HTMLElement>(".db-container");
        if (!container) return;
        // Reset so each run measures from the un-padded position.
        node.style.paddingLeft = "0px";
        container.style.marginLeft = "0px";

        const gap = blockLeft - container.getBoundingClientRect().left;
        // Pad the SCROLLER — included in scrollWidth, so scroll reaches the end.
        node.style.paddingLeft = `${Math.max(0, gap)}px`;
      });
    };

    align();

    const ro = new ResizeObserver(align);
    const wrapper = document.querySelector(containerSelector);
    if (wrapper) ro.observe(wrapper);
    document
      .querySelectorAll<HTMLElement>(".db-container")
      .forEach((c) => ro.observe(c));

    return () => ro.disconnect();
  }, [containerSelector]);
}

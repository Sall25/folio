import { useEffect } from "react";

/**
 * Lines each top-level database up with its page's text column by padding
 * its scroller (.db-node). Each database is measured against a block of its
 * OWN editor (the page, a peek, a centred page), never the first block in
 * the whole document: with a peek open, that could be the other editor's.
 *
 * Measured again when the layout moves: on resize, and once the layout's
 * slide transitions finish. Closing a side peek or the sidebar animates the
 * column (0.15 s); a measure taken mid-slide used to stick, leaving the
 * database at the window's left edge.
 */
export function useDatabaseAlign(containerSelector = ".simple-editor-center") {
  useEffect(() => {
    const alignNode = (node: HTMLElement) => {
      // Nested in a callout, a column…: sized by its block, no padding.
      if (node.closest("[data-contained-in]")) {
        if (node.style.paddingLeft) node.style.paddingLeft = "";
        return;
      }
      const container = node.querySelector<HTMLElement>(".db-container");
      const editor = node.closest<HTMLElement>(".ProseMirror");
      const block =
        editor?.querySelector<HTMLElement>(":scope > .top-level-block") ??
        editor?.querySelector<HTMLElement>(".top-level-block");
      if (!container || !block) return;
      container.style.marginLeft = "0px";
      const blockLeft = block.getBoundingClientRect().left;

      // Where the database would start with no padding and no sideways
      // scroll. Measured from the current position instead of resetting
      // the padding to 0 first: that reset shrank the scroll width (the
      // table jumped back to its start), and measuring while scrolled
      // added the scroll distance to the padding (the toolbar and table
      // slid right). Both happened whenever the table changed width, e.g.
      // when Add Property opens.
      const currentPad = parseFloat(getComputedStyle(node).paddingLeft) || 0;
      const unpaddedLeft =
        container.getBoundingClientRect().left - currentPad + node.scrollLeft;
      // Pad the SCROLLER — included in scrollWidth, so scroll reaches the end.
      const pad = Math.max(0, blockLeft - unpaddedLeft);
      if (Math.abs(pad - currentPad) > 0.5) {
        node.style.paddingLeft = `${pad}px`;
      }
    };

    const align = () =>
      document.querySelectorAll<HTMLElement>(".db-node").forEach(alignNode);

    // Once more after a slide has had time to finish, in case no
    // transitionend reaches us (a transition cut short).
    let settle = 0;
    const alignSoon = () => {
      align();
      window.clearTimeout(settle);
      settle = window.setTimeout(align, 220);
    };

    // The layout's slides: the text column's transform / width, the
    // database's margin, the sidebar and peek panels.
    const onTransitionEnd = (e: TransitionEvent) => {
      if (
        e.propertyName === "transform" ||
        e.propertyName === "width" ||
        e.propertyName === "margin-left" ||
        e.propertyName === "left" ||
        e.propertyName === "flex-basis"
      ) {
        align();
      }
    };

    align();

    const ro = new ResizeObserver(alignSoon);
    const wrapper = document.querySelector(containerSelector);
    if (wrapper) ro.observe(wrapper);
    document
      .querySelectorAll<HTMLElement>(".db-container, .db-node")
      .forEach((c) => ro.observe(c));
    document.addEventListener("transitionend", onTransitionEnd, true);
    window.addEventListener("resize", alignSoon);

    return () => {
      ro.disconnect();
      window.clearTimeout(settle);
      document.removeEventListener("transitionend", onTransitionEnd, true);
      window.removeEventListener("resize", alignSoon);
    };
  }, [containerSelector]);
}

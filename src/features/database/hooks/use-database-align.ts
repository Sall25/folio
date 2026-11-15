import { useEffect } from "react";

/**
 * The padding that puts a database's content on `edge`.
 *
 * `containerLeft` is where its content sits now, with `currentPad` already
 * on the scroller and `scrollLeft` scrolled off to the left: take both back
 * out and what is left is where the content would start with no padding at
 * all. The distance from there to the edge is the padding.
 *
 * Reading the current padding rather than resetting it to zero first is
 * deliberate (see below), and it makes this idempotent: once the content is
 * on the edge, the same number comes back and nothing is written.
 */
export function paddingForEdge(
  edge: number,
  containerLeft: number,
  currentPad: number,
  scrollLeft: number,
): number {
  return Math.max(0, edge - (containerLeft - currentPad + scrollLeft));
}

/**
 * Lines each top-level database up with its page's text column by padding
 * its scroller (.db-node). Each database is measured against a block of its
 * OWN editor (the page, a peek, a centred page), never the first block in
 * the whole document: with a peek open, that could be the other editor's.
 *
 * A timeline is lined up with the sidebar's edge instead — it needs the
 * width. This padding is written inline, so it is also the reason a
 * stylesheet cannot set it: anything a rule says about the left padding of
 * a .db-node is overruled here, on the next resize at the latest.
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
      // A timeline is the one view whose body does not line up with the
      // text column. The table beside its grid costs the grid 220px that
      // the column cannot spare, so the body starts where the sidebar ends
      // and spends the width the database has on screen. Everything else
      // below is the same; only the edge it is lined up with changes.
      const timeline = !!node.querySelector(".db-tl-layout-wrap");
      if (!container || (!block && !timeline)) return;
      container.style.marginLeft = "0px";
      const blockLeft = block?.getBoundingClientRect().left ?? 0;
      // The sidebar starts at the window's left edge, so its width is where
      // it ends. Read from the node, which inherits it from the editor.
      const edge = timeline
        ? parseFloat(
            getComputedStyle(node).getPropertyValue("--sidebar-width"),
          ) || 0
        : blockLeft;

      // Only the body moves. A database's title and toolbar read as part of
      // the page, so they stay in its column: the stylesheet puts them back
      // by the distance the body gave up, which is this.
      if (timeline && block) {
        node.style.setProperty(
          "--db-column-inset",
          `${Math.max(0, blockLeft - edge)}px`,
        );
      } else {
        node.style.removeProperty("--db-column-inset");
      }

      // Where the database would start with no padding and no sideways
      // scroll. Measured from the current position instead of resetting
      // the padding to 0 first: that reset shrank the scroll width (the
      // table jumped back to its start), and measuring while scrolled
      // added the scroll distance to the padding (the toolbar and table
      // slid right). Both happened whenever the table changed width, e.g.
      // when Add Property opens.
      const currentPad = parseFloat(getComputedStyle(node).paddingLeft) || 0;
      // Pad the SCROLLER — included in scrollWidth, so scroll reaches the end.
      const pad = paddingForEdge(
        edge,
        container.getBoundingClientRect().left,
        currentPad,
        node.scrollLeft,
      );
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

import { useCallback } from "react";
import { location } from "src/app/routes";
import { writeStorage } from "src/lib/local-storage";
import { usePageViewActions } from "src/features/pages/context/page-view-context";
import { placeOf } from "../tabs/tab-label";

// Two pages side by side: the page in this tab, and another page beside it
// in the side view (the peek: its own editor and toolbar, resizable; the
// page behind makes room for it). Opened at half the window. Works while
// this tab shows a page and the other one is a page too (the side view
// shows pages only).

/** Key the side view keeps its width under (page-peek-view.tsx). */
const PEEK_WIDTH_KEY = "peek-width";

export function canOpenBeside(path: string): boolean {
  return (
    placeOf(path).kind === "page" &&
    placeOf(location.current.pathname).kind === "page"
  );
}

export function useOpenBeside() {
  const { setTarget } = usePageViewActions();
  return useCallback(
    (path: string): boolean => {
      if (!canOpenBeside(path)) return false;
      const place = placeOf(path);
      if (place.kind !== "page") return false;
      writeStorage(PEEK_WIDTH_KEY, Math.round(window.innerWidth / 2));
      setTarget({ pageId: place.id, view: "Peek" });
      return true;
    },
    [setTarget],
  );
}

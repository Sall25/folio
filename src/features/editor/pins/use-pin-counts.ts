import { useMemo, useSyncExternalStore } from "react";
import type { Editor } from "@tiptap/core";
import { usePins } from "src/hooks/use-pins";
import { useOptionalActivePage } from "src/features/pages/context/active-page-context";
import { PINNABLE_TYPES, pagePinCount } from "./pin-targets";

/** Blocks of this page pinned to the pane (a pinned list's own items don't
 *  count: the list is one pin). */
export function countPagePins(editor: Editor): number {
  let n = 0;
  editor.state.doc.descendants((node) => {
    if (PINNABLE_TYPES.includes(node.type.name) && node.attrs.pinSide) {
      n++;
      return false;
    }
    return true;
  });
  return n;
}

/** The pane's tab counts. `team` is null when the open page isn't in a
 *  teamspace (no Team tab). */
export function usePinCounts() {
  const page = useSyncExternalStore(pagePinCount.subscribe, pagePinCount.get);
  const { activePage } = useOptionalActivePage();
  const teamspaceId = activePage?.teamspaceId ?? null;
  const { data: pins } = usePins();
  return useMemo(() => {
    const all = pins ?? [];
    const mine = all.filter((p) => p.scope === "mine").length;
    const team = teamspaceId
      ? all.filter(
          (p) => p.scope === "teamspace" && p.teamspaceId === teamspaceId,
        ).length
      : null;
    return { page, mine, team, total: page + mine + (team ?? 0) };
  }, [pins, teamspaceId, page]);
}

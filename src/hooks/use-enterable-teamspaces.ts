import { useMemo } from "react";
import type { Page, Teamspace } from "src/types";
import { useTeamspaces } from "./use-teamspaces";
import { usePagesByCategory } from "./use-pages";

export interface EnterableTeamspace {
  /** Root page: display name, icon, host workspace. */
  page: Page;
  record: Teamspace;
}

// Teamspaces you can enter: those whose root page RLS lets you read — the
// current workspace's teamspaces plus ones you've joined elsewhere, never
// teamspaces in your other owned workspaces. Sorted by name.
export function useEnterableTeamspaces(): EnterableTeamspace[] {
  const { data: teamspaces = [] } = useTeamspaces();
  const { data: teamspacePages = [] } = usePagesByCategory("Teamspaces");

  return useMemo(() => {
    const recordById = new Map(
      (teamspaces as Teamspace[]).map((ts) => [ts.id, ts]),
    );
    return (teamspacePages as Page[])
      .filter((p) => p.parentId == null && recordById.has(p.id))
      .map((page) => ({ page, record: recordById.get(page.id)! }))
      .sort((a, b) =>
        (a.page.title || "").localeCompare(b.page.title || "", undefined, {
          sensitivity: "base",
        }),
      );
  }, [teamspaces, teamspacePages]);
}

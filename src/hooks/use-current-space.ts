import { useMemo } from "react";
import { useLocation } from "@tanstack/react-location";
import type { ID, Page, Teamspace, Workspace } from "src/types";
import { useCurrentWorkspace } from "./use-workspaces";
import { useTeamspaces } from "./use-teamspaces";
import { usePagesByCategory } from "./use-pages";

// The space the app is currently rendering through: your workspace, or a
// teamspace you've entered. The URL is the source of truth (/t/:id/...), so a
// reload or a shared link lands in the right space. Entering a teamspace never
// touches your workspace membership — that's what switch_workspace is for.
export type CurrentSpace =
  | { kind: "workspace"; id: ID | null; workspace: Workspace | null }
  | {
      kind: "teamspace";
      id: ID;
      teamspace: Teamspace | null;
      // Root page: carries the teamspace's display name and icon.
      page: Page | null;
    };

const TEAMSPACE_PATH = /^\/t\/([^/]+)/;

export function teamspaceIdFromPath(pathname: string): ID | null {
  const match = pathname.match(TEAMSPACE_PATH);
  return match ? match[1] : null;
}

export function spaceHomePath(teamspaceId: ID | null): string {
  return teamspaceId ? `/t/${teamspaceId}` : "/";
}

export function spacePagePath(teamspaceId: ID | null, pageId: ID): string {
  return teamspaceId ? `/t/${teamspaceId}/page/${pageId}` : `/page/${pageId}`;
}

export function useCurrentSpace(): CurrentSpace {
  const location = useLocation();
  const pathname = location.current.pathname;
  const teamspaceId = teamspaceIdFromPath(pathname);

  const { workspace } = useCurrentWorkspace();
  const { data: teamspaces = [] } = useTeamspaces();
  const { data: teamspacePages = [] } = usePagesByCategory("Teamspaces");

  return useMemo<CurrentSpace>(() => {
    if (teamspaceId) {
      return {
        kind: "teamspace",
        id: teamspaceId,
        teamspace:
          (teamspaces as Teamspace[]).find((t) => t.id === teamspaceId) ?? null,
        page:
          (teamspacePages as Page[]).find((p) => p.id === teamspaceId) ?? null,
      };
    }
    return { kind: "workspace", id: workspace?.id ?? null, workspace };
  }, [teamspaceId, teamspaces, teamspacePages, workspace]);
}

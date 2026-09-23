import { useCallback, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "src/api/supabase-client";
import { queryKeys } from "src/lib/queryKeys";
import type { ID, Teamspace } from "src/types";
import { useTeamspaces } from "./use-teamspaces";
import { useCurrentPerson } from "./use-session";

const EMPTY: ID[] = [];

// Shared pins for a teamspace. Everyone sees the same list; only teamspace
// owners can change it (enforced server-side in set_teamspace_pin).
export function useTeamspacePins(teamspaceId: ID | null) {
  const qc = useQueryClient();
  const { data: teamspaces = [] } = useTeamspaces();
  const { person } = useCurrentPerson();

  const teamspace = useMemo(
    () =>
      teamspaceId
        ? (teamspaces as Teamspace[]).find((t) => t.id === teamspaceId)
        : undefined,
    [teamspaces, teamspaceId],
  );

  const pinnedIds = teamspace?.pinnedPageIds ?? EMPTY;
  const canPin =
    !!teamspace && !!person && teamspace.ownerIds.includes(person.id);

  const mutation = useMutation({
    mutationFn: async ({ pageId, pinned }: { pageId: ID; pinned: boolean }) => {
      const { error } = await supabase.rpc("set_teamspace_pin", {
        ts_id: teamspaceId,
        page_id: pageId,
        pinned,
      });
      if (error) throw error;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.teamspaces.all });
    },
  });

  const isPinned = useCallback(
    (pageId: ID) => pinnedIds.includes(pageId),
    [pinnedIds],
  );

  const setPinned = useCallback(
    (pageId: ID, pinned: boolean) => {
      if (!teamspaceId || !canPin) return;
      mutation.mutate({ pageId, pinned });
    },
    [teamspaceId, canPin, mutation],
  );

  return { pinnedIds, canPin, isPinned, setPinned };
}

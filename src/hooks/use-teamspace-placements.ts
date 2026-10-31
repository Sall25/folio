import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addTeamspacePlacement,
  fetchTeamspacePlacements,
  moveTeamspace,
  removeTeamspacePlacement,
  type TeamspacePlacement,
} from "src/api/teamspace-placements";
import { queryKeys } from "src/lib/queryKeys";
import type { ID } from "src/types";

export const teamspacePlacementsKey = ["teamspace-placements"] as const;

/** Where you show teamspaces besides their home (yours only). */
export function useTeamspacePlacements() {
  return useQuery({
    queryKey: teamspacePlacementsKey,
    queryFn: fetchTeamspacePlacements,
    staleTime: 60_000,
  });
}

/** The teamspaces you show in this workspace on top of its own ones. */
export function usePlacedHere(workspaceId: ID | null | undefined) {
  const { data } = useTeamspacePlacements();
  return useMemo(
    () =>
      new Set(
        (data ?? [])
          .filter((p) => p.workspaceId === workspaceId)
          .map((p) => p.teamspaceId),
      ),
    [data, workspaceId],
  );
}

/** Show a teamspace in a workspace's sidebar, or stop. */
export function useSetTeamspacePlacement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ on, ...p }: TeamspacePlacement & { on: boolean }) =>
      on ? addTeamspacePlacement(p) : removeTeamspacePlacement(p),
    onMutate: async ({ on, ...p }) => {
      await qc.cancelQueries({ queryKey: teamspacePlacementsKey });
      const before =
        qc.getQueryData<TeamspacePlacement[]>(teamspacePlacementsKey);
      qc.setQueryData<TeamspacePlacement[]>(teamspacePlacementsKey, (old) => {
        const rest = (old ?? []).filter(
          (x) =>
            !(x.teamspaceId === p.teamspaceId && x.workspaceId === p.workspaceId),
        );
        return on ? [...rest, p] : rest;
      });
      return { before };
    },
    onError: (_e, _v, ctx) => {
      qc.setQueryData(teamspacePlacementsKey, ctx?.before);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: teamspacePlacementsKey });
    },
  });
}

/** Move a teamspace's home workspace, for everyone (owners). */
export function useMoveTeamspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ teamspaceId, workspaceId }: TeamspacePlacement) =>
      moveTeamspace(teamspaceId, workspaceId),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.teamspaces.all });
      void qc.invalidateQueries({ queryKey: queryKeys.pages.all });
      void qc.invalidateQueries({ queryKey: teamspacePlacementsKey });
    },
  });
}

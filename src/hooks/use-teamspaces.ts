import { useQuery } from "@tanstack/react-query";
import type { Teamspace, ID, Person } from "../types";
import { queryKeys } from "../lib/queryKeys";
import { fetchTeamspaces, fetchTeamspace } from "../api/teamspaces";
import { usePeopleBase } from "./use-people";

function useTeamspacesBase<T>(select?: (teamspaces: Teamspace[]) => T) {
  return useQuery({
    queryKey: queryKeys.teamspaces.lists(),
    queryFn: fetchTeamspaces,
    select,
  });
}

export function useTeamspaces() {
  return useTeamspacesBase();
}

export function useTeamspace(id: ID | null) {
  return useQuery({
    queryKey: queryKeys.teamspaces.detail(id ?? ""),
    queryFn: () => fetchTeamspace(id!),
    enabled: id != null,
  });
}

// generic resolver: id list + entity list → entities, order-preserving
function resolveIds<T extends { id: ID }>(ids: ID[], entities: T[]): T[] {
  const byId = new Map(entities.map((e) => [e.id, e]));
  return ids.map((id) => byId.get(id)).filter((e): e is T => e !== undefined);
}

export function useTeamspaceMembers(teamspaceId: ID | null) {
  const tsQuery = useTeamspacesBase((ts) =>
    ts.find((t) => t.id === teamspaceId),
  );
  const peopleQuery = usePeopleBase();
  const members =
    tsQuery.data && peopleQuery.data
      ? resolveIds(tsQuery.data.memberIds, peopleQuery.data as Person[])
      : [];
  return {
    members,
    isPending: tsQuery.isPending || peopleQuery.isPending,
    isError: tsQuery.isError || peopleQuery.isError,
  };
}

export function useTeamspaceOwners(teamspaceId: ID | null) {
  const tsQuery = useTeamspacesBase((ts) =>
    ts.find((t) => t.id === teamspaceId),
  );
  const peopleQuery = usePeopleBase();
  const owners =
    tsQuery.data && peopleQuery.data
      ? resolveIds(tsQuery.data.ownerIds, peopleQuery.data as Person[])
      : [];
  return {
    owners,
    isPending: tsQuery.isPending || peopleQuery.isPending,
    isError: tsQuery.isError || peopleQuery.isError,
  };
}

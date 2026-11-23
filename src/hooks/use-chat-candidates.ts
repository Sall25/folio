import { useMemo } from "react";
import type { Group, Person, Teamspace } from "src/types";
import { useCurrentPerson } from "./use-session";
import { usePeople } from "./use-people";
import { useTeamspaces } from "./use-teamspaces";
import { useGroups } from "./use-groups";
import { useCurrentSpace } from "./use-current-space";
import { useEnterableTeamspaces } from "./use-enterable-teamspaces";
import { useChatPeople } from "./use-chat";

// Who you can add, mirroring the server rules:
//   • "room" in a teamspace → that teamspace's members (direct, owners, groups);
//   • "room" in your workspace → your workspace's people;
//   • "dm" → anyone you share a workspace or a teamspace with.
// Names come from useChatPeople, which also resolves people in other
// workspaces (usePeople only has yours).
//
// `scope` is the room being invited to, when there is one. Without it the
// list followed whichever space the person was standing in, which is not
// the same thing: inviting to a teamspace room from the workspace offered
// the whole workspace, and the server then dropped everyone who was not in
// that teamspace — silently, until this was fixed (migration 060). The
// candidates and the server now read the same rule.
export function useChatCandidates(
  mode: "room" | "dm",
  excludeIds: string[] = [],
  scope?: { teamspaceId: string | null },
) {
  const { person } = useCurrentPerson();
  const { data: people = [] } = usePeople();
  const { data: teamspaces = [] } = useTeamspaces();
  const { data: groups = [] } = useGroups();
  const space = useCurrentSpace();
  const enterable = useEnterableTeamspaces();
  const excludeKey = excludeIds.join(",");
  // undefined: no room was named, so follow the space the person is in.
  // null: a room that belongs to the workspace rather than a teamspace.
  const scopedTeamspace = scope ? scope.teamspaceId : undefined;

  const ids = useMemo(() => {
    const set = new Set<string>();
    const addTeamspace = (ts: Teamspace) => {
      ts.memberIds.forEach((id) => set.add(id));
      ts.ownerIds.forEach((id) => set.add(id));
      for (const g of groups as Group[]) {
        if (ts.groupIds.includes(g.id))
          g.memberIds.forEach((id) => set.add(id));
      }
    };

    const roomTeamspace =
      mode !== "room"
        ? null
        : scopedTeamspace !== undefined
          ? scopedTeamspace
          : space.kind === "teamspace"
            ? space.id
            : null;

    if (roomTeamspace) {
      const ts = (teamspaces as Teamspace[]).find(
        (t) => t.id === roomTeamspace,
      );
      if (ts) addTeamspace(ts);
    } else {
      (people as Person[]).forEach((p) => set.add(p.id));
      if (mode === "dm") enterable.forEach((e) => addTeamspace(e.record));
    }

    if (person) set.delete(person.id);
    for (const id of excludeKey ? excludeKey.split(",") : []) set.delete(id);
    return [...set];
  }, [
    mode,
    space,
    scopedTeamspace,
    teamspaces,
    groups,
    people,
    enterable,
    person,
    excludeKey,
  ]);

  const { data = [], isLoading } = useChatPeople(ids);
  const candidates = useMemo(
    () =>
      [...data].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      ),
    [data],
  );

  return { candidates, isLoading };
}

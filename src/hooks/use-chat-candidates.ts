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
export function useChatCandidates(
  mode: "room" | "dm",
  excludeIds: string[] = [],
) {
  const { person } = useCurrentPerson();
  const { data: people = [] } = usePeople();
  const { data: teamspaces = [] } = useTeamspaces();
  const { data: groups = [] } = useGroups();
  const space = useCurrentSpace();
  const enterable = useEnterableTeamspaces();
  const excludeKey = excludeIds.join(",");

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

    if (mode === "room" && space.kind === "teamspace") {
      const ts = (teamspaces as Teamspace[]).find((t) => t.id === space.id);
      if (ts) addTeamspace(ts);
    } else {
      (people as Person[]).forEach((p) => set.add(p.id));
      if (mode === "dm") enterable.forEach((e) => addTeamspace(e.record));
    }

    if (person) set.delete(person.id);
    for (const id of excludeKey ? excludeKey.split(",") : []) set.delete(id);
    return [...set];
  }, [mode, space, teamspaces, groups, people, enterable, person, excludeKey]);

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

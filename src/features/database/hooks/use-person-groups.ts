import { useMemo } from "react";
import type { Group } from "src/types";
import { useGroups } from "src/hooks/use-groups";
import type { PersonGroupOption } from "../primitives/person-cell-display";
import { useWorkspacePeople } from "./use-workspace-people";

/** The workspace's groups with their members, to assign a whole group in a
 *  person cell. Groups with nobody in them are left out. */
export function usePersonGroups(): PersonGroupOption[] {
  const { data } = useGroups();
  const people = useWorkspacePeople();
  return useMemo(() => {
    const byId = new Map(people.map((p) => [p.id, p]));
    return ((data ?? []) as Group[])
      .map((g) => ({
        id: g.id,
        name: g.name,
        members: g.memberIds
          .map((id) => byId.get(id))
          .filter((p): p is NonNullable<typeof p> => !!p),
      }))
      .filter((g) => g.members.length > 0);
  }, [data, people]);
}

import { useCallback } from "react";
import { usePeople } from "./use-people";
import { useCurrentPerson } from "./use-session";
import type { ID, Person } from "src/types";

export function usePersonNames() {
  const { data: people = [] } = usePeople();
  const { person: currentPerson } = useCurrentPerson();

  return useCallback(
    (personId: ID) => {
      if (personId === currentPerson?.id) return "You";
      return (
        (people as Person[]).find((p) => p.id === personId)?.name ?? "Unknown"
      );
    },
    [people, currentPerson],
  );
}

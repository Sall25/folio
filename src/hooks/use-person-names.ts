import { useCallback, useRef, useState } from "react";
import { usePeopleById } from "./use-people";
import { useCurrentPerson } from "./use-session";
import type { ID } from "src/types";

/**
 * A function that turns a person id into a name ("You" for yourself unless
 * `useFullname`).
 *
 * Looks in the current workspace's people first. Someone who isn't in it —
 * a former member, a guest, a teamspace member from another workspace —
 * used to show as "Unknown": the ids asked for and not found are now
 * remembered and fetched (usePeopleById), and the name appears once they've
 * loaded. "Unknown" stays only for someone whose profile no longer exists.
 */
export function usePersonNames(useFullname: boolean = false) {
  const { person: currentPerson } = useCurrentPerson();
  const [wanted, setWanted] = useState<ID[]>([]);
  const byId = usePeopleById(wanted);
  // Ids already queued for fetching, so each is asked for once.
  const requested = useRef(new Set<ID>());

  return useCallback(
    (personId: ID) => {
      if (personId === currentPerson?.id && !useFullname) return "You";
      const person = byId.get(personId);
      if (person) return person.name;
      if (personId && !requested.current.has(personId)) {
        requested.current.add(personId);
        // Not during render: right after it.
        queueMicrotask(() => setWanted((w) => [...w, personId]));
      }
      return "Unknown";
    },
    [byId, currentPerson, useFullname],
  );
}
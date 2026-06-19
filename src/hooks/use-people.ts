import { useQuery } from "@tanstack/react-query";
import type { Person, MemberRole, ID } from "../types";
import { queryKeys } from "../lib/queryKeys";
import { fetchPeople, fetchPerson } from "../api/people";

export function usePeopleBase<T>(select?: (people: Person[]) => T) {
  return useQuery({
    queryKey: queryKeys.people.lists(),
    queryFn: fetchPeople,
    select,
  });
}

export function usePeople() {
  return usePeopleBase();
}

export function usePeopleByRole(role: MemberRole) {
  return usePeopleBase((people) => people.filter((p) => p.role === role));
}

export function usePerson(id: ID | null) {
  return useQuery({
    queryKey: queryKeys.people.detail(id ?? ""),
    queryFn: () => fetchPerson(id!),
    enabled: id != null,
  });
}

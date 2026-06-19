import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPerson } from "../api/people";
import type { Person } from "../types";
import { queryKeys } from "../lib/queryKeys";

export function useCreatePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (person: Person) => {
      return createPerson(person);
    },
    onMutate: async (person: Person) => {
      await qc.cancelQueries({ queryKey: queryKeys.people.all });

      const previousPersonList = qc.getQueriesData<Person[]>({
        queryKey: queryKeys.people.lists(),
      });

      qc.setQueriesData<Person[]>(
        { queryKey: queryKeys.people.lists() },
        (people) => (people ? [...people, person] : people),
      );

      return { previousPersonList };
    },
    onError: (_error, _vars, ctx) => {
      ctx?.previousPersonList.forEach(([key, data]) =>
        qc.setQueryData(key, data),
      );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.people.all });
    },
  });
}

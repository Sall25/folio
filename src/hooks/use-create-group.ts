import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Group } from "../types";
import { createGroup } from "../api/groups";
import { queryKeys } from "../lib/queryKeys";

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (group: Group) => {
      return createGroup(group);
    },
    onMutate: async (group: Group) => {
      await qc.cancelQueries({ queryKey: queryKeys.groups.all });

      const previousGroupList = qc.getQueriesData<Group[]>({
        queryKey: queryKeys.groups.lists(),
      });

      qc.setQueriesData<Group[]>(
        { queryKey: queryKeys.groups.lists() },
        (groups) => (groups ? [...groups, group] : groups),
      );

      return { previousGroupList };
    },
    onError: (_error, _vars, ctx) => {
      ctx?.previousGroupList.forEach(([key, data]) =>
        qc.setQueryData(key, data),
      );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.groups.all });
    },
  });
}

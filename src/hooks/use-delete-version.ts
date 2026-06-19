import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ID, Version } from "../types";
import { deleteVersion } from "../api/versions";
import { queryKeys } from "../lib/queryKeys";

export function useDeleteVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: ID) => {
      await deleteVersion(id);
    },
    onMutate: async (id: ID) => {
      await qc.cancelQueries({ queryKey: queryKeys.versions.all });

      const previousVersionList = qc.getQueriesData<Version[]>({
        queryKey: queryKeys.versions.lists(),
      });

      qc.setQueriesData<Version[]>(
        { queryKey: queryKeys.versions.lists() },
        (versions) => (versions ?? []).filter((v) => v.id !== id),
      );

      return { previousVersionList };
    },

    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: queryKeys.versions.detail(id) });
    },

    onError: (_error, _vars, ctx) => {
      ctx?.previousVersionList.forEach(([key, data]) =>
        qc.setQueryData(key, data),
      );
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.versions.all });
    },
  });
}

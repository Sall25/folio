import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Version } from "../types";
import { createVersion } from "../api/versions";
import { queryKeys } from "../lib/queryKeys";

export function useCreateVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (version: Version) => {
      return createVersion(version);
    },
    onMutate: async (version: Version) => {
      await qc.cancelQueries({ queryKey: queryKeys.versions.all });

      const previousVersionList = qc.getQueriesData<Version[]>({
        queryKey: queryKeys.versions.lists(),
      });

      qc.setQueriesData<Version[]>(
        { queryKey: queryKeys.versions.lists() },
        (versions) => (versions ? [...versions, version] : versions),
      );

      return { previousVersionList };
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

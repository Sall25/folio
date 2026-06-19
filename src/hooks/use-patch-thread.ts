import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ID, Thread } from "../types";
import { queryKeys } from "../lib/queryKeys";

export type ThreadPatch = Partial<Omit<Thread, "id">>;

export function usePatchThread(
  mutationFn: (args: { id: ID; patch: ThreadPatch }) => Promise<Thread>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onMutate: async ({ id, patch }: { id: ID; patch: ThreadPatch }) => {
      await qc.cancelQueries({ queryKey: queryKeys.threads.all });

      const previousThreads = qc.getQueriesData<Thread[]>({
        queryKey: queryKeys.threads.lists(),
      });
      const previousThreadDetail = qc.getQueryData(
        queryKeys.threads.detail(id),
      );

      qc.setQueriesData<Thread[]>(
        { queryKey: queryKeys.threads.lists() },
        (old) => old?.map((o) => (o.id === id ? { ...o, ...patch } : o)),
      );
      qc.setQueryData<Thread>(queryKeys.threads.detail(id), (t) =>
        t?.id === id ? { ...t, ...patch } : t,
      );

      return { previousThreads, previousThreadDetail };
    },
    onError: (_error, vars, ctx) => {
      ctx?.previousThreads.forEach(([key, data]) => qc.setQueryData(key, data));
      if (ctx?.previousThreadDetail)
        qc.setQueryData(
          queryKeys.threads.detail(vars.id),
          ctx.previousThreadDetail,
        );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.threads.all });
    },
  });
}

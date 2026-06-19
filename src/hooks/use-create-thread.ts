import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Thread } from "../types";
import { createThread } from "../api/threads";
import { queryKeys } from "../lib/queryKeys";

export function useCreateThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (thread: Thread) => {
      return createThread(thread);
    },
    onMutate: async (thread: Thread) => {
      await qc.cancelQueries({ queryKey: queryKeys.threads.all });

      const previousThreadList = qc.getQueriesData<Thread[]>({
        queryKey: queryKeys.threads.lists(),
      });

      qc.setQueriesData<Thread[]>(
        { queryKey: queryKeys.threads.lists() },
        (threads) => (threads ? [...threads, thread] : threads),
      );

      return { previousThreadList };
    },
    onError: (_error, _vars, ctx) => {
      ctx?.previousThreadList.forEach(([key, data]) =>
        qc.setQueryData(key, data),
      );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.threads.all });
    },
  });
}

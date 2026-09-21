import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ID, Page } from "../types";
import { queryKeys } from "../lib/queryKeys";

export type PagePatch = Partial<Omit<Page, "id">>;

export function usePatchPage(
  mutationFn: (args: { id: ID; patch: PagePatch }) => Promise<Page>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onMutate: async ({ id, patch }: { id: ID; patch: PagePatch }) => {
      await qc.cancelQueries({ queryKey: queryKeys.pages.all });

      const previousPages = qc.getQueriesData<Page[]>({
        queryKey: queryKeys.pages.all,
      });
      const previousPageDetail = qc.getQueryData<Page>(
        queryKeys.pages.detail(id),
      );

      // `.all` matches list entries (Page[]) AND detail entries (single Page).
      // Only .map over arrays — a detail entry isn't iterable/mappable. The
      // detail entry is handled by the explicit setQueryData(detail(id)) below.
      qc.setQueriesData<Page[]>({ queryKey: queryKeys.pages.all }, (old) =>
        Array.isArray(old)
          ? old.map((o) => (o.id === id ? { ...o, ...patch } : o))
          : old,
      );
      qc.setQueryData<Page>(queryKeys.pages.detail(id), (p) =>
        p ? { ...p, ...patch } : p,
      );

      return { previousPages, previousPageDetail };
    },
    onError: (_error, vars, ctx) => {
      ctx?.previousPages.forEach(([key, data]) => qc.setQueryData(key, data));
      if (ctx?.previousPageDetail)
        qc.setQueryData(
          queryKeys.pages.detail(vars.id),
          ctx.previousPageDetail,
        );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pages.all });
    },
  });
}

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ID, Workspace } from "../types";
import { queryKeys } from "../lib/queryKeys";

export type WorkspacePatch = Partial<Omit<Workspace, "id">>;

export function usePatchWorkspace(
  mutationFn: (args: { id: ID; patch: WorkspacePatch }) => Promise<Workspace>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onMutate: async ({ id, patch }: { id: ID; patch: WorkspacePatch }) => {
      await qc.cancelQueries({ queryKey: queryKeys.workspaces.all });

      const previousWorkspaces = qc.getQueriesData<Workspace[]>({
        queryKey: queryKeys.workspaces.lists(),
      });
      const previousWorkspaceDetail = qc.getQueryData<Workspace>(
        queryKeys.workspaces.detail(id),
      );

      // Shallow merge for the optimistic update. `settings` is replaced whole
      // when patched (callers pass a complete settings object), so a deep merge
      // isn't needed — a partial settings patch should be pre-merged by the
      // caller before calling this. See setSettingsAsync in useManageWorkspace.
      qc.setQueriesData<Workspace[]>(
        { queryKey: queryKeys.workspaces.lists() },
        (old) => old?.map((o) => (o.id === id ? { ...o, ...patch } : o)),
      );
      qc.setQueryData<Workspace>(queryKeys.workspaces.detail(id), (w) =>
        w?.id === id ? { ...w, ...patch } : w,
      );

      return { previousWorkspaces, previousWorkspaceDetail };
    },
    onError: (_error, vars, ctx) => {
      ctx?.previousWorkspaces.forEach(([key, data]) =>
        qc.setQueryData(key, data),
      );
      if (ctx?.previousWorkspaceDetail)
        qc.setQueryData(
          queryKeys.workspaces.detail(vars.id),
          ctx.previousWorkspaceDetail,
        );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.workspaces.all });
    },
  });
}

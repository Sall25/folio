import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ID } from "../types";
import { gatherDeleteCascade } from "../lib/cascade";
import {
  snapshotForPlan,
  applyPlanOptimistic,
  rollbackPlan,
  removeDeletedDetails,
  PLAN_NAMESPACES,
} from "../lib/apply-delete-plan";
import { executeDeletePlan } from "../lib/execute-delete-plan";
import { fetchPages } from "../api/pages";
import { fetchThreadsByPage } from "../api/threads";
import { fetchVersionsByPage } from "../api/versions";
import { fetchDataSources } from "../api/data-sources";
import { fetchCommentsByThread } from "../api/comments";
import { fetchTeamspaces } from "../api/teamspaces";

export function useDeletePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: ID) => {
      const [allPages, allSources, teamspaces] = await Promise.all([
        fetchPages(),
        fetchDataSources(),
        fetchTeamspaces(),
      ]);
      const prelim = gatherDeleteCascade(
        { pageRoots: [id], sourceRoots: [] },
        { allPages, allSources, threads: [], comments: [], versions: [] },
      );
      const threadArrays = await Promise.all(
        [...prelim.pageIds].map((pid) => fetchThreadsByPage(pid)),
      );
      const threads = threadArrays.flat();
      const versionArrays = await Promise.all(
        [...prelim.pageIds].map((pid) => fetchVersionsByPage(pid)),
      );
      const versions = versionArrays.flat();

      // comments derived from threadId now — fetch per thread, not from commentIds
      const commentArrays = await Promise.all(
        threads.map((t) => fetchCommentsByThread(t.id)),
      );
      const comments = commentArrays.flat();

      const plan = gatherDeleteCascade(
        { pageRoots: [id], sourceRoots: [] },
        { allPages, allSources, threads, comments, versions, teamspaces },
      );
      await executeDeletePlan(plan, allSources, allPages);
    },
    onMutate: async (id: ID) => {
      await Promise.all(
        PLAN_NAMESPACES.map((qk) => qc.cancelQueries({ queryKey: qk })),
      );
      const snap = snapshotForPlan(qc);

      // build the plan from CACHE (optimistic)
      const allPages = snap.pages.flatMap(([, p]) => p ?? []);
      const allSources = snap.sources.flatMap(([, s]) => s ?? []);
      const threads = snap.threads.flatMap(([, t]) => t ?? []);
      const comments = snap.comments.flatMap(([, c]) => c ?? []);
      const versions = snap.versions.flatMap(([, v]) => v ?? []);
      const teamspaces = snap.teamspaces.flatMap(([, t]) => t ?? []);
      const plan = gatherDeleteCascade(
        { pageRoots: [id], sourceRoots: [] },
        { allPages, allSources, threads, comments, versions, teamspaces },
      );

      applyPlanOptimistic(qc, plan);
      return { snap, plan };
    },
    onSuccess: (_d, _v, ctx) => {
      if (ctx) removeDeletedDetails(qc, ctx.plan);
    },
    onError: (_e, _v, ctx) => {
      if (ctx) rollbackPlan(qc, ctx.snap);
    },
    onSettled: () => {
      PLAN_NAMESPACES.forEach((qk) => qc.invalidateQueries({ queryKey: qk }));
    },
  });
}

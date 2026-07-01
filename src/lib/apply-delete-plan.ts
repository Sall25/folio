import type { QueryClient } from "@tanstack/react-query";
import type {
  DataSource,
  Page,
  Thread,
  Comment,
  Version,
  Teamspace,
} from "../types";
import type { DeletePlan } from "./cascade";
import { queryKeys } from "./queryKeys";

// snapshot every list cache the plan touches, for rollback
export function snapshotForPlan(qc: QueryClient) {
  return {
    sources: qc.getQueriesData<DataSource[]>({
      queryKey: queryKeys.dataSources.lists(),
    }),
    pages: qc.getQueriesData<Page[]>({ queryKey: queryKeys.pages.lists() }),
    threads: qc.getQueriesData<Thread[]>({
      queryKey: queryKeys.threads.lists(),
    }),
    comments: qc.getQueriesData<Comment[]>({
      queryKey: queryKeys.comments.lists(),
    }),
    versions: qc.getQueriesData<Version[]>({
      queryKey: queryKeys.versions.lists(),
    }),
    teamspaces: qc.getQueriesData<Teamspace[]>({
      queryKey: queryKeys.teamspaces.lists(),
    }),
  };
}

// apply the plan optimistically to the cache
export function applyPlanOptimistic(qc: QueryClient, plan: DeletePlan) {
  // sources: drop deleted ones, strip removed props from survivors
  qc.setQueriesData<DataSource[]>(
    { queryKey: queryKeys.dataSources.lists() },
    (list) =>
      (list ?? [])
        .filter((s) => !plan.sourceIds.has(s.id))
        .map((s) => {
          const drop = plan.propsToRemove.get(s.id);
          return drop
            ? { ...s, properties: s.properties.filter((p) => !drop.has(p.id)) }
            : s;
        }),
  );

  // pages: drop deleted ones, strip removed-relation cells from surviving rows
  qc.setQueriesData<Page[]>({ queryKey: queryKeys.pages.lists() }, (list) =>
    (list ?? [])
      .filter((p) => !plan.pageIds.has(p.id))
      .map((p) => {
        const drop = p.sourceId
          ? plan.propsToRemove.get(p.sourceId)
          : undefined;
        if (!drop || p.values == null) return p;
        let changed = false;
        const values = { ...p.values };
        for (const pid of drop)
          if (pid in values) {
            delete values[pid];
            changed = true;
          }
        return changed ? { ...p, values } : p;
      }),
  );

  qc.setQueriesData<Thread[]>({ queryKey: queryKeys.threads.lists() }, (l) =>
    (l ?? []).filter((t) => !plan.threadIds.has(t.id)),
  );
  qc.setQueriesData<Comment[]>({ queryKey: queryKeys.comments.lists() }, (l) =>
    (l ?? []).filter((c) => !plan.commentIds.has(c.id)),
  );
  qc.setQueriesData<Version[]>({ queryKey: queryKeys.versions.lists() }, (l) =>
    (l ?? []).filter((v) => !plan.versionIds.has(v.id)),
  );
  // teamspace records joined to any deleted page by shared id
  qc.setQueriesData<Teamspace[]>(
    { queryKey: queryKeys.teamspaces.lists() },
    (l) => (l ?? []).filter((t) => !plan.teamspaceIds.has(t.id)),
  );
}

// restore all snapshots (rollback)
export function rollbackPlan(
  qc: QueryClient,
  snap: ReturnType<typeof snapshotForPlan>,
) {
  snap.sources.forEach(([key, data]) => qc.setQueryData(key, data));
  snap.pages.forEach(([key, data]) => qc.setQueryData(key, data));
  snap.threads.forEach(([key, data]) => qc.setQueryData(key, data));
  snap.comments.forEach(([key, data]) => qc.setQueryData(key, data));
  snap.versions.forEach(([key, data]) => qc.setQueryData(key, data));
  snap.teamspaces.forEach(([key, data]) => qc.setQueryData(key, data));
}

// drop detail entries for everything deleted (onSuccess)
export function removeDeletedDetails(qc: QueryClient, plan: DeletePlan) {
  plan.sourceIds.forEach((id) =>
    qc.removeQueries({ queryKey: queryKeys.dataSources.detail(id) }),
  );
  plan.pageIds.forEach((id) =>
    qc.removeQueries({ queryKey: queryKeys.pages.detail(id) }),
  );
  plan.threadIds.forEach((id) =>
    qc.removeQueries({ queryKey: queryKeys.threads.detail(id) }),
  );
  plan.commentIds.forEach((id) =>
    qc.removeQueries({ queryKey: queryKeys.comments.detail(id) }),
  );
  plan.versionIds.forEach((id) =>
    qc.removeQueries({ queryKey: queryKeys.versions.detail(id) }),
  );
  plan.teamspaceIds.forEach((id) =>
    qc.removeQueries({ queryKey: queryKeys.teamspaces.detail(id) }),
  );
}

// the namespaces every plan touches — for cancel + invalidate
export const PLAN_NAMESPACES = [
  queryKeys.dataSources.all,
  queryKeys.pages.all,
  queryKeys.threads.all,
  queryKeys.comments.all,
  queryKeys.versions.all,
  queryKeys.teamspaces.all,
] as const;
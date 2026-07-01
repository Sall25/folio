import type { DeletePlan } from "./cascade";
import type { DataSource, Page } from "../types";
import { deletePage, patchPage } from "../api/pages";
import { deleteThread } from "../api/threads";
import { deleteComment } from "../api/comments";
import { deleteVersion } from "../api/versions";
import { deleteDataSource, patchDataSource } from "../api/data-sources";
import { deleteTeamspace } from "../api/teamspaces";

export async function executeDeletePlan(
  plan: DeletePlan,
  allSources: DataSource[],
  allPages: Page[],
) {
  // 1. strip removed properties from surviving sources (server-side)
  await Promise.all(
    [...plan.propsToRemove].map(([sourceId, propIds]) => {
      const s = allSources.find((x) => x.id === sourceId);
      if (!s || plan.sourceIds.has(sourceId)) return Promise.resolve(); // deleted sources go away wholesale
      return patchDataSource(sourceId, {
        properties: s.properties.filter((p) => !propIds.has(p.id)),
      });
    }),
  );

  // 2. strip removed-relation cells from surviving row-pages
  await Promise.all(
    allPages
      .filter(
        (p) =>
          !plan.pageIds.has(p.id) && p.sourceId != null && p.values != null,
      )
      .map((p) => {
        const drop = plan.propsToRemove.get(p.sourceId!);
        if (!drop) return Promise.resolve();
        const entries = Object.entries(p.values!).filter(([k]) => !drop.has(k));
        if (entries.length === Object.keys(p.values!).length)
          return Promise.resolve();
        return patchPage(p.id, { values: Object.fromEntries(entries) });
      }),
  );

  // 3. delete entities, leaves → up. Teamspace records are joined to pages by
  //    shared id; deleting them alongside the pages keeps the pair consistent.
  await Promise.all([...plan.commentIds].map((id) => deleteComment(id)));
  await Promise.all([...plan.threadIds].map((id) => deleteThread(id)));
  await Promise.all([...plan.versionIds].map((id) => deleteVersion(id)));
  await Promise.all([...plan.teamspaceIds].map((id) => deleteTeamspace(id)));
  await Promise.all([...plan.pageIds].map((id) => deletePage(id)));
  await Promise.all([...plan.sourceIds].map((id) => deleteDataSource(id)));
}

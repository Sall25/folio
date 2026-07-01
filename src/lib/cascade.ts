import type {
  DataSource,
  Page,
  Thread,
  Version,
  Teamspace,
  ID,
} from "../types";

// ─── pure piece 1: subtree ──────────────────────────────────────────────────
export function collectSubtree(pages: Page[], rootId: ID): Set<ID> {
  const childrenMap = new Map<ID, Page[]>();
  for (const page of pages) {
    if (page.parentId == null) continue;
    const kids = childrenMap.get(page.parentId) ?? [];
    kids.push(page);
    childrenMap.set(page.parentId, kids);
  }
  const seen = new Set<ID>([rootId]);
  const stack: ID[] = [rootId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const kid of childrenMap.get(current) ?? []) {
      if (!seen.has(kid.id)) {
        seen.add(kid.id);
        stack.push(kid.id);
      }
    }
  }
  return seen;
}

// ─── pure piece 2: partition pages into regular vs container ────────────────
export function partitionPages(pageIds: Set<ID>, allSources: DataSource[]) {
  const containerSourceIds = new Set<ID>();
  for (const s of allSources) {
    if (pageIds.has(s.pageId)) containerSourceIds.add(s.id);
  }
  return { containerSourceIds };
}

// ─── pure piece 3: plan the source sweep (relations/mirrors/owned pages) ─────
export function planSourceSweep(
  deletedSourceIds: Set<ID>,
  allSources: DataSource[],
  allPages: Page[],
) {
  const propsToRemove = new Map<ID, Set<ID>>();
  const addRemove = (sId: ID, pId: ID) => {
    const set = propsToRemove.get(sId) ?? new Set<ID>();
    set.add(pId);
    propsToRemove.set(sId, set);
  };

  // owned page roots: each deleted source's container page + its row-pages
  const ownedPageRoots: ID[] = [];
  for (const s of allSources) {
    if (deletedSourceIds.has(s.id)) ownedPageRoots.push(s.pageId);
  }
  for (const p of allPages) {
    if (p.sourceId != null && deletedSourceIds.has(p.sourceId))
      ownedPageRoots.push(p.id);
  }

  // (inbound) surviving sources with relations pointing AT a deleted source
  for (const s of allSources) {
    if (deletedSourceIds.has(s.id)) continue;
    for (const p of s.properties) {
      if (
        p.config.type === "relation" &&
        deletedSourceIds.has(p.config.targetSourceId)
      )
        addRemove(s.id, p.id);
    }
  }
  // (outbound) deleted sources' relations → remove their mirrors on surviving targets
  for (const s of allSources) {
    if (!deletedSourceIds.has(s.id)) continue;
    for (const p of s.properties) {
      if (p.config.type === "relation") {
        const rel = p.config;
        if (
          rel.mirrorPropertyId != null &&
          !deletedSourceIds.has(rel.targetSourceId)
        ) {
          addRemove(rel.targetSourceId, rel.mirrorPropertyId);
        }
      }
    }
  }

  return { ownedPageRoots, propsToRemove };
}

// ─── pure piece 4: gather page dependents ───────────────────────────────────
export function gatherPageDependents(
  pageIds: Set<ID>,
  threads: Thread[],
  comments: { id: ID; threadId: ID }[],
  versions: Version[],
) {
  const threadIds = new Set(
    threads.filter((t) => pageIds.has(t.pageId)).map((t) => t.id),
  );
  const commentIds = new Set(
    comments.filter((c) => threadIds.has(c.threadId)).map((c) => c.id),
  );
  const versionIds = new Set(
    versions.filter((v) => pageIds.has(v.pageId)).map((v) => v.id),
  );
  return { threadIds, commentIds, versionIds };
}

// ─── pure piece 5: teamspace records joined to deleted pages by shared id ────
// A teamspace IS a page (category "Teamspaces") whose Teamspace record shares
// its id. So once the final page set is known, the teamspace records to delete
// are simply the records whose id is in that set — a pure intersection, no
// extra fetch or graph walk needed.
export function gatherTeamspaceRecords(
  pageIds: Set<ID>,
  teamspaces: Teamspace[],
): Set<ID> {
  const ids = new Set<ID>();
  for (const ts of teamspaces) {
    if (pageIds.has(ts.id)) ids.add(ts.id);
  }
  return ids;
}

// ─── THE COMPOSITION: chain the pieces into one complete plan ────────────────
export type DeletePlan = {
  pageIds: Set<ID>;
  sourceIds: Set<ID>;
  threadIds: Set<ID>;
  commentIds: Set<ID>;
  versionIds: Set<ID>;
  teamspaceIds: Set<ID>;
  propsToRemove: Map<ID, Set<ID>>; // sourceId → property ids to strip
};

export function gatherDeleteCascade(
  seed: { pageRoots: ID[]; sourceRoots: ID[] },
  data: {
    allPages: Page[];
    allSources: DataSource[];
    threads: Thread[];
    comments: { id: ID; threadId: ID }[];
    versions: Version[];
    // Optional so existing callers that don't pass it still compile — teamspace
    // sweep just yields an empty set when omitted.
    teamspaces?: Teamspace[];
  },
): DeletePlan {
  const {
    allPages,
    allSources,
    threads,
    comments,
    versions,
    teamspaces = [],
  } = data;

  // 1. start with the seeded sources, plus expand seeded page roots into subtrees
  const sourceIds = new Set<ID>(seed.sourceRoots);
  const pageIds = new Set<ID>();
  for (const root of seed.pageRoots) {
    for (const pid of collectSubtree(allPages, root)) pageIds.add(pid);
  }

  // 2. classify: any page in the subtree that's a container → its source joins the delete
  const { containerSourceIds } = partitionPages(pageIds, allSources);
  for (const sid of containerSourceIds) sourceIds.add(sid);

  // 3. plan the sweep for ALL sources being deleted (seeded + discovered)
  const { ownedPageRoots, propsToRemove } = planSourceSweep(
    sourceIds,
    allSources,
    allPages,
  );

  // 4. those sources own pages (containers + rows) — expand THOSE into subtrees too,
  //    merging into the page set. (Invariant: row-pages can't be containers, so no
  //    further source discovery is needed — this terminates without a fixpoint loop.)
  for (const root of ownedPageRoots) {
    for (const pid of collectSubtree(allPages, root)) pageIds.add(pid);
  }

  // 5. gather dependents over the FINAL page set
  const { threadIds, commentIds, versionIds } = gatherPageDependents(
    pageIds,
    threads,
    comments,
    versions,
  );

  // 6. teamspace records joined to any deleted page by shared id
  const teamspaceIds = gatherTeamspaceRecords(pageIds, teamspaces);

  return {
    pageIds,
    sourceIds,
    threadIds,
    commentIds,
    versionIds,
    teamspaceIds,
    propsToRemove,
  };
}

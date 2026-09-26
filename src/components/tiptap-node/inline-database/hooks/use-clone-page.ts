import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { JSONContent } from "@tiptap/core";
import { newId } from "src/lib/id";
import { queryKeys } from "src/lib/queryKeys";
import type { ID, Page, DataSource, PageCategory } from "src/types";
import { createPage, fetchPages } from "src/api/pages";
import { createDataSource, fetchDataSource } from "src/api/data-sources";
import { useCurrentPerson } from "src/hooks/use-session";
import { useActivePageActions } from "src/components/tiptap-templates/simple/context/active-page-context";

// Where the clone lands. Defaults = the original behavior: the user's Private
// section, private access, and navigate to it.
export interface ClonePlacement {
  parentId?: ID | null;
  teamspaceId?: ID | null;
  category?: PageCategory;
  generalAccess?: Page["generalAccess"];
  generalAccessRole?: Page["generalAccessRole"];
  /** Open the clone once created (default true). */
  navigate?: boolean;
}

// Point every database node that referenced the old source at the new one.
function remapSourceIds(node: JSONContent, from: ID, to: ID): JSONContent {
  const attrs =
    node.type === "database" && node.attrs?.sourceId === from
      ? { ...node.attrs, sourceId: to }
      : node.attrs;
  return {
    ...node,
    ...(attrs ? { attrs } : {}),
    ...(node.content
      ? { content: node.content.map((c) => remapSourceIds(c, from, to)) }
      : {}),
  };
}

export function useClonePage() {
  const qc = useQueryClient();
  const { person } = useCurrentPerson();
  const { setActivePageId } = useActivePageActions();
  const [cloning, setCloning] = useState(false);

  const clone = useCallback(
    async (source: Page, placement: ClonePlacement = {}) => {
      if (!person) return;
      setCloning(true);
      try {
        const newPageId = newId();
        const category = placement.category ?? "Private";
        const generalAccess = placement.generalAccess ?? "private";
        const generalAccessRole = placement.generalAccessRole ?? "view";

        // Is this page a database container? (It owns a DataSource whose rows
        // are pages with sourceId === that source's id.) Cloning a database
        // means cloning: the container page, the DataSource, and every row-page.
        const containerSourceId = await findSourceIdForPage(source.id);
        const newSourceId = containerSourceId ? newId() : null;

        // Base clone of the page itself — new identity, user's ownership,
        // placed per `placement` (leaves Showcase/Template, becomes editable).
        const cloned: Page = {
          ...structuredClone(source),
          id: newPageId,
          ownerId: person.id,
          category,
          parentId: placement.parentId ?? null,
          teamspaceId: placement.teamspaceId ?? null,
          generalAccess,
          generalAccessRole,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        if (containerSourceId && newSourceId) {
          // The copy's database block must show the NEW source, not the original.
          cloned.content = remapSourceIds(
            cloned.content,
            containerSourceId,
            newSourceId,
          );

          const src = await fetchDataSource(containerSourceId);

          // All pages currently in cache → this source's rows (and its row
          // template pages, which also carry the sourceId).
          const allPages = await fetchPages();
          const rows = allPages.filter((p) => p.sourceId === containerSourceId);

          // Remap every row to a fresh id, re-parent under the new container,
          // re-own, and point at the new source. Template pages STAY
          // templates — otherwise they'd surface as live rows.
          const idMap = new Map<ID, ID>();
          const newRows: Page[] = rows.map((r) => {
            const rid = newId();
            idMap.set(r.id, rid);
            const isTemplate = r.category === "Template";
            return {
              ...structuredClone(r),
              id: rid,
              sourceId: newSourceId,
              ownerId: person.id,
              parentId: newPageId,
              teamspaceId: placement.teamspaceId ?? null,
              category: isTemplate ? ("Template" as const) : category,
              generalAccess,
              generalAccessRole,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
          });

          // The new DataSource points at the new container page, and its row
          // templates at the CLONED template pages — editing "your" template
          // must never edit the original's.
          const newSource: DataSource = {
            ...structuredClone(src),
            id: newSourceId,
            pageId: newPageId,
            rowTemplates: (src.rowTemplates ?? []).map((t) => ({
              ...t,
              pageId: t.pageId ? (idMap.get(t.pageId) ?? t.pageId) : t.pageId,
            })),
          };

          await createPage(cloned);
          await createDataSource(newSource);
          for (const r of newRows) await createPage(r);
        } else {
          await createPage(cloned);
        }

        await qc.invalidateQueries({ queryKey: queryKeys.pages.all });
        await qc.invalidateQueries({ queryKey: queryKeys.dataSources.all });
        if (placement.navigate ?? true) setActivePageId(newPageId);
        return cloned;
      } finally {
        setCloning(false);
      }
    },
    [person, qc, setActivePageId],
  );

  return { clone, cloning };
}

// A page is a database container if some DataSource has pageId === page.id.
// (DataSource.pageId is the container link, per your DataSource type.)
async function findSourceIdForPage(pageId: ID): Promise<ID | null> {
  const { fetchDataSources } = await import("src/api/data-sources");
  const sources = await fetchDataSources();
  return sources.find((s) => s.pageId === pageId)?.id ?? null;
}

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { newId } from "src/lib/id";
import { queryKeys } from "src/lib/queryKeys";
import type { ID, Page, DataSource } from "src/types";
import { createPage, fetchPages } from "src/api/pages";
import { createDataSource, fetchDataSource } from "src/api/data-sources";
import { useCurrentPerson } from "src/hooks/use-session";
import { useActivePage } from "src/components/tiptap-templates/simple/context/active-page-context";

export function useClonePage() {
  const qc = useQueryClient();
  const { person } = useCurrentPerson();
  const { setActivePageId } = useActivePage();
  const [cloning, setCloning] = useState(false);

  const clone = useCallback(
    async (source: Page) => {
      if (!person) return;
      setCloning(true);
      try {
        const newPageId = newId();

        // Is this page a database container? (It owns a DataSource whose rows
        // are pages with sourceId === that source's id.) Cloning a database
        // means cloning: the container page, the DataSource, and every row-page.
        const containerSourceId = await findSourceIdForPage(source.id);

        // Base clone of the page itself — new identity, user's ownership,
        // dropped into their Private section (leaves Showcase, becomes editable).
        const cloned: Page = {
          ...structuredClone(source),
          id: newPageId,
          ownerId: person.id,
          category: "Private",
          parentId: null,
          generalAccess: "private",
          generalAccessRole: "view",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        if (containerSourceId) {
          const src = await fetchDataSource(containerSourceId);

          // All pages currently in cache → this source's rows.
          const allPages = await fetchPages();
          const rows = allPages.filter((p) => p.sourceId === containerSourceId);

          const newSourceId = newId();

          // Remap every row to a fresh id, re-parent under the new container,
          // re-own, and point at the new source.
          const idMap = new Map<ID, ID>();
          const newRows: Page[] = rows.map((r) => {
            const rid = newId();
            idMap.set(r.id, rid);
            return {
              ...structuredClone(r),
              id: rid,
              sourceId: newSourceId,
              ownerId: person.id,
              parentId: newPageId,
              category: "Private",
              generalAccess: "private" as const,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
          });

          // The new DataSource points at the new container page.
          const newSource: DataSource = {
            ...structuredClone(src),
            id: newSourceId,
            pageId: newPageId,
          };

          await createDataSource(newSource);
          await createPage(cloned);
          for (const r of newRows) await createPage(r);
        } else {
          await createPage(cloned);
        }

        await qc.invalidateQueries({ queryKey: queryKeys.pages.lists() });
        await qc.invalidateQueries({ queryKey: queryKeys.dataSources.all });
        setActivePageId(newPageId);
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

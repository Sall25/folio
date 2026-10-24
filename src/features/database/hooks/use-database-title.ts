// The database TITLE: resolving the display title and persisting a rename to
// both the DataSource (source.name) and the container page (title + the title
// node in its content). Linked views keep an independent label and never
// rename the source.
//
// A database made from a block has no page until it's given a title: the
// first title creates its page (under the page holding the block, opening in
// the block's view), moves any rows made so far under it, and from then on
// the two titles stay in step.

import { useRef, useEffect, useCallback } from "react";
import { useDebouncedCallback } from "use-debounce";
import type { JSONContent } from "@tiptap/core";
import type { DatabaseAttrs, DataSource, ID, Page } from "src/types";
import { usePages, useRows } from "src/hooks/use-pages";
import { usePatchPage } from "src/hooks/use-patch-page";
import { patchPage } from "src/api/pages";
import { useCreatePage } from "src/hooks/use-create-page";
import { useCurrentPerson } from "src/hooks/use-session";
import { useCurrentWorkspace } from "src/hooks/use-workspaces";
import { makeDatabasePage } from "src/utils/make-page";
import { newId } from "src/lib/id";

interface Params {
  attrs: DatabaseAttrs;
  /** The data source: a source with no page gets one on its first title. */
  source?: DataSource | null;
  sourceName: string | undefined;
  sourcePageId: string | null | undefined;
  updateSourceMetaAsync: (meta: { name?: string; pageId?: ID }) => unknown;
  updateAttributes: (attrs: Partial<DatabaseAttrs>) => void;
}

export function useDatabaseTitle({
  attrs,
  source,
  sourceName,
  sourcePageId,
  updateSourceMetaAsync,
  updateAttributes,
}: Params) {
  const { data: pages } = usePages();
  const pagesRef = useRef(pages);
  useEffect(() => void (pagesRef.current = pages), [pages]);

  const { data: rows } = useRows(source?.id ?? "");
  const rowsRef = useRef(rows);
  useEffect(() => void (rowsRef.current = rows), [rows]);

  const mutatePage = usePatchPage(({ id, patch }) => patchPage(id, patch));
  const createPage = useCreatePage();
  const { person } = useCurrentPerson();
  const { workspaceId } = useCurrentWorkspace();

  // The page being made right now, and the latest title typed meanwhile.
  const creatingRef = useRef(false);
  const latestTitleRef = useRef<string | null>(null);

  const createDatabasePage = async (title: string) => {
    if (creatingRef.current || !source || !person || !workspaceId) return;
    creatingRef.current = true;
    try {
      const host = pagesRef.current?.find(
        (p: Page) => p.id === source.hostPageId,
      );
      // The page opens in the view the block shows.
      const active =
        attrs.views.find((v) => v.id === attrs.activeViewId) ?? attrs.views[0];
      const view = active
        ? { ...structuredClone(active), id: newId() }
        : undefined;
      const dbPage = makeDatabasePage({
        sourceId: source.id,
        name: title,
        parentId: source.hostPageId ?? null,
        category: host?.category,
        teamspaceId: host?.teamspaceId ?? null,
        ownerId: person.id,
        workspaceId,
        view,
      });
      await createPage.mutateAsync(dbPage);
      await updateSourceMetaAsync({ name: title, pageId: dbPage.id });
      updateAttributes({ pageId: dbPage.id });

      // Rows made before the page existed sit under the page holding the
      // block: move them under the database's page.
      for (const row of rowsRef.current ?? []) {
        if (row.parentId !== dbPage.id) {
          void mutatePage.mutateAsync({
            id: row.id,
            patch: { parentId: dbPage.id },
          });
        }
      }

      // Typed more while the page was being made: name it that.
      const latest = latestTitleRef.current;
      if (latest && latest !== title) persistTitle(latest);
    } catch (error) {
      console.error("creating the database page failed:", error);
    } finally {
      creatingRef.current = false;
    }
  };

  const persistTitle = useDebouncedCallback(
    (title: string) => {
      const dbPageId = sourcePageId ?? attrs.pageId ?? null;

      // No page yet: the first title makes it.
      if (dbPageId == null && source && source.pageId == null) {
        void createDatabasePage(title);
        return;
      }

      updateSourceMetaAsync({ name: title });
      if (dbPageId != null && pagesRef.current) {
        const dbPage = pagesRef.current.find((p: Page) => p.id === dbPageId);
        if (dbPage) {
          const content = dbPage.content as JSONContent;
          const updatedContent: JSONContent = content.content?.length
            ? {
                ...content,
                content: content.content.map((n, i) =>
                  i !== 0
                    ? n
                    : { ...n, content: [{ type: "text", text: title }] },
                ),
              }
            : content;
          mutatePage.mutateAsync({
            id: dbPageId,
            patch: { title, content: updatedContent },
          });
        }
      }
    },
    300,
    { maxWait: 600 },
  );

  const isLinked = !!attrs.isLinked;
  const resolvedTitle = attrs.title || sourceName || "";

  const handleTitleChange = useCallback(
    (title: string) => {
      latestTitleRef.current = title;
      updateAttributes({ title });

      if (!isLinked) {
        persistTitle(title);
      }
    },
    [updateAttributes, isLinked, persistTitle],
  );

  return { resolvedTitle, handleTitleChange };
}

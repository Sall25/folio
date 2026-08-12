// The database TITLE: resolving the display title and persisting a rename to
// both the DataSource (source.name) and the container page (title + the title
// node in its content). Linked views keep an independent label and never
// rename the source.

import { useRef, useEffect, useCallback } from "react";
import { useDebouncedCallback } from "use-debounce";
import type { JSONContent } from "@tiptap/core";
import type { DatabaseAttrs, Page } from "src/types";
import { usePages } from "src/hooks/use-pages";
import { usePatchPage } from "src/hooks/use-patch-page";
import { patchPage } from "src/api/pages";

interface Params {
  attrs: DatabaseAttrs;
  sourceName: string | undefined;
  sourcePageId: string | null | undefined;
  updateSourceMetaAsync: (meta: { name: string }) => void;
  updateAttributes: (attrs: Partial<DatabaseAttrs>) => void;
}

export function useDatabaseTitle({
  attrs,
  sourceName,
  sourcePageId,
  updateSourceMetaAsync,
  updateAttributes,
}: Params) {
  const { data: pages } = usePages();
  const pagesRef = useRef(pages);
  useEffect(() => void (pagesRef.current = pages), [pages]);

  const mutatePage = usePatchPage(({ id, patch }) => patchPage(id, patch));

  const persistTitle = useDebouncedCallback(
    (title: string) => {
      updateSourceMetaAsync({ name: title });
      const dbPageId = sourcePageId ?? attrs.pageId ?? null;
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
      updateAttributes({ title });

      if (!isLinked) {
        persistTitle(title);
      }
    },
    [updateAttributes, isLinked, persistTitle],
  );

  return { resolvedTitle, handleTitleChange };
}

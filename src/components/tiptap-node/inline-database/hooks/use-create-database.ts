import { useCallback } from "react";
import type { Editor } from "@tiptap/core";
import { useDataSources } from "../hooks/use-data-sources";
import { usePages } from "src/components/tiptap-templates/simple/use-pages";
import { useActivePage } from "src/components/tiptap-templates/simple/use-active-page";
import type { DatabaseProperty } from "../types/types";

function defaultProperties(): DatabaseProperty[] {
  return [
    {
      id: crypto.randomUUID(),
      name: "Name",
      config: { type: "title" },
      width: 240,
    },
    {
      id: crypto.randomUUID(),
      name: "Tags",
      config: { type: "select", options: [] },
      width: 160,
    },
  ];
}

function defaultView() {
  return {
    id: crypto.randomUUID(),
    name: "Table",
    type: "table" as const,
    filters: [],
    sorts: [],
    hiddenProperties: [],
    propertyOrder: [],
  };
}

// builds the database page's content: title node + database node owning its sourceId/title
export function databasePageContent(sourceId: string, name: string) {
  const view = defaultView();
  return {
    type: "doc",
    content: [
      { type: "title", content: name ? [{ type: "text", text: name }] : [] },
      {
        type: "database",
        attrs: {
          id: crypto.randomUUID(),
          sourceId,
          pageId: null, // cover resolves via source.pageId
          title: name,
          views: [view],
          activeViewId: view.id,
        },
      },
    ],
  };
}

export function useCreateDatabase(editor: Editor) {
  const { createSourceAsync } = useDataSources();
  const { addPageAsync } = usePages();
  const { activePageId } = useActivePage();

  return useCallback(async () => {
    const sourceId = crypto.randomUUID();
    const name = "Untitled";

    // 1. dedicated page, content seeded with the database node (node owns its identity)
    const dbPage = await addPageAsync({
      title: name,
      parentId: activePageId ?? null,
      databaseId: sourceId,
      content: databasePageContent(sourceId, name),
    });

    // 2. the source, carrying its page link
    const source = await createSourceAsync({
      id: sourceId,
      name,
      pageId: dbPage.id,
      properties: defaultProperties(),
      records: [],
    });

    // 3. inline embed on the host page (a second database node → same source)
    editor.chain().focus().insertDatabaseWithSource(source.id, dbPage.id).run();
  }, [editor, createSourceAsync, addPageAsync, activePageId]);
}

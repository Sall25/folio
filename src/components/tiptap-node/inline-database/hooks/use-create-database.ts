import { useCallback } from "react";
import type { Editor } from "@tiptap/core";
import { newId } from "src/lib/id";
import type { DatabaseProperty } from "src/types";
import type { Page } from "src/types";
import { useCreatePage } from "src/hooks/use-create-page";
import { useCreateDataSource } from "src/hooks/use-create-data-source";
import { useActivePage } from "src/components/tiptap-templates/simple/context/active-page-context";
import { makePage } from "src/utils/make-page";

function defaultProperties(): DatabaseProperty[] {
  return [
    { id: newId(), name: "Name", config: { type: "title" }, width: 240 },
    {
      id: newId(),
      name: "Tags",
      config: { type: "select", options: [] },
      width: 160,
    },
  ];
}

function defaultView() {
  return {
    id: newId(),
    name: "Table",
    type: "table" as const,
    filters: [],
    sorts: [],
    hiddenProperties: [],
    propertyOrder: [],
  };
}

// the database page's content: title node + database node referencing the source
export function databasePageContent(sourceId: string, name: string) {
  const view = defaultView();
  return {
    type: "doc",
    content: [
      { type: "title", content: name ? [{ type: "text", text: name }] : [] },
      {
        type: "database",
        attrs: {
          id: newId(),
          sourceId,
          pageId: null, // resolves via source.pageId
          title: name,
          views: [view],
          activeViewId: view.id,
        },
      },
    ],
  };
}

export function useCreateDatabase(editor: Editor) {
  const createPage = useCreatePage();
  const createSource = useCreateDataSource();
  const { activePageId } = useActivePage();

  return useCallback(async () => {
    const sourceId = newId();
    const name = "Untitled";

    // 1. CONTAINER PAGE FIRST. It owns the database, so sourceId stays null
    //    (it is NOT a row). The source's guard fetches this page next and
    //    requires sourceId == null — so the page must exist before the source.
    const dbPage: Page = {
      ...makePage({
        title: name,
        parentId: activePageId ?? null,
        category: "Private",
      }),
      content: databasePageContent(sourceId, name),
    };
    await createPage.mutateAsync(dbPage);

    // 2. the source, pointing at the now-existing container page.
    //    useCreateDataSource's guard fetches dbPage, sees sourceId == null, allows it.
    const source = await createSource.mutateAsync({
      id: sourceId,
      name,
      pageId: dbPage.id,
      properties: defaultProperties(),
      savedViews: [],
      views: [defaultView()],
      createdAt: Date.now(),
      updatedAt: null,
      rowTemplates: [],
    });

    // 3. inline embed on the HOST page (the one being edited) — a second
    //    database node referencing the same source.
    editor.chain().focus().insertDatabaseWithSource(source.id, dbPage.id).run();
  }, [editor, createPage, createSource, activePageId]);
}

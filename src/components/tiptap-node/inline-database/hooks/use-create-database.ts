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

export function useCreateDatabase(editor: Editor) {
  const { createSourceAsync } = useDataSources();
  const { addPageAsync } = usePages();
  const { activePageId } = useActivePage();

  return useCallback(async () => {
    const sourceId = crypto.randomUUID();
    // the database's own page (its cover/icon live here)
    const page = await addPageAsync({
      title: "Untitled",
      parentId: activePageId ?? null,
      databaseId: sourceId, // mark this page as belonging to the database
    });
    const source = await createSourceAsync({
      id: sourceId,
      name: "Untitled",
      properties: defaultProperties(),
      records: [],
    });
    editor.chain().focus().insertDatabaseWithSource(source.id, page.id).run();
  }, [editor, createSourceAsync, addPageAsync, activePageId]);
}

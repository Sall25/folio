import { useCallback } from "react";
import type { Editor } from "@tiptap/core";
import type {
  DatabaseAttrs,
  DataSource,
  ID,
  Page,
  CellValue,
  PropertyType,
  DatabaseProperty,
} from "src/types";
import { insertRecordNode } from "./use-database-seed";
import { NONE_KEY, valueForGroupKey } from "../utils/group-records";

export function useRecordCreation({
  editor,
  attrs,
  source,
  groupProp,
  addRecordAsync,
  setCellValue,
  setEditingRecordId,
}: {
  editor: Editor;
  attrs: DatabaseAttrs;
  source: DataSource | null;
  groupProp: DatabaseProperty | undefined;
  addRecordAsync: (opts?: {
    title?: string;
    templateId?: string;
  }) => Promise<Page>;
  setCellValue: (
    recordId: string,
    propertyId: string,
    value: CellValue<PropertyType>,
  ) => void;
  setEditingRecordId: (id: ID) => void;
}) {
  // Insert the freshly-created page's node into the editor, if the db is wired.
  const insertNode = useCallback(
    (page: Page) => {
      if (editor && attrs.id && attrs.sourceId && source) {
        insertRecordNode(
          editor,
          attrs.id,
          attrs.sourceId,
          page,
          source.properties,
        );
      }
    },
    [editor, attrs.id, attrs.sourceId, source],
  );

  const onNewRecord = useCallback(() => {
    addRecordAsync({ title: "" })
      .then((page) => {
        insertNode(page);
        setEditingRecordId(page.id);
      })
      .catch(() => console.log("Failed to create page"));
  }, [addRecordAsync, insertNode, setEditingRecordId]);

  const onNewRecordInGroup = useCallback(
    (groupKey: string) => {
      addRecordAsync({ title: "" })
        .then((page) => {
          insertNode(page);
          if (groupProp && groupKey !== NONE_KEY) {
            setCellValue(
              page.id,
              groupProp.id,
              valueForGroupKey(groupKey, groupProp) as never,
            );
          }
          setEditingRecordId(page.id);
        })
        .catch(() => console.log("Failed to create page"));
    },
    [addRecordAsync, insertNode, setCellValue, groupProp, setEditingRecordId],
  );

  return { onNewRecord, onNewRecordInGroup };
}

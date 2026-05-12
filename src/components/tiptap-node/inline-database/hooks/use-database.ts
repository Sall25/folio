import type { Editor } from "@tiptap/core";
import type { DatabaseAttrs } from "../types/types";
import { useDatabaseProperties } from "./use-database-properties";
import { useDatabaseRecords } from "./use-database-records";
import { useDatabaseUI } from "./use-database-ui";

export type UseDatabaseReturn = ReturnType<typeof useDatabase>;

export function useDatabase(
  attrs: DatabaseAttrs,
  editor: Editor,
  onUpdateTitle?: (title: string) => void,
) {
  const nodeId = attrs.id;
  const prop = useDatabaseProperties(nodeId, editor);
  const record = useDatabaseRecords(nodeId, editor, attrs.properties);
  const ui = useDatabaseUI(attrs, editor);
  const title = attrs.title;

  return {
    ...prop,
    ...record,
    ...ui,
    title,
    onUpdateTitle,
  };
}

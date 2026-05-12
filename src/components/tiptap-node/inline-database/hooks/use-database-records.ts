import { useCallback } from "react";
import type { Editor } from "@tiptap/core";
import type { ID, DatabaseProperty } from "../types/types";
import { resolveFormulaValues } from "../components/formula-editor/resolve-formula-values.js";

export function useDatabaseRecords(
  nodeId: ID,
  editor: Editor,
  properties: DatabaseProperty[],
) {
  const addRecord = useCallback(() => {
    editor.commands.addDatabaseRecord(nodeId);
  }, [editor, nodeId]);

  const deleteRecord = useCallback(
    (recordId: ID) => {
      editor.commands.deleteDatabaseRecord(nodeId, recordId);
    },
    [editor, nodeId],
  );

  const updateCell = useCallback(
    (recordId: ID, propertyId: ID, value: unknown) => {
      editor.commands.updateDatabaseCell(nodeId, recordId, propertyId, value);
      resolveFormulaValues(editor, nodeId, properties);
    },
    [editor, nodeId, properties],
  );

  return { addRecord, deleteRecord, updateCell };
}

// Builds the per-database "bridge" payload the cell/record NodeViews read
// (properties, records-by-id, column widths, column values, setCellValue) and
// publishes it into editor storage so those NodeViews — which live outside
// this React tree and can't receive context — can access it, keyed by the
// database node id.

import { useMemo } from "react";
import type { Editor } from "@tiptap/react";
import type {
  DatabaseAttrs,
  DatabaseProperty,
  DatabaseView,
  Page,
} from "src/types";
import { usePublishDatabaseData } from "./use-database-bridge-data";
import type { DatabaseBridgeData } from "../utils/database-bridge";

interface Params {
  editor: Editor | null;
  attrs: DatabaseAttrs;
  properties: DatabaseProperty[];
  activeView: DatabaseView | undefined;
  locked: boolean;
  resolvedRecords: Page[];
  sortedRecords: Page[];
  draftWidths: Record<string, number>;
  hasSource: boolean;
  setCellValue: (recordId: string, propertyId: string, value: unknown) => void;
}

export function useDatabaseBridgePublish({
  editor,
  attrs,
  properties,
  activeView,
  locked,
  resolvedRecords,
  sortedRecords,
  draftWidths,
  hasSource,
  setCellValue,
}: Params) {
  const recordsById = useMemo(
    () => new Map((hasSource ? resolvedRecords : []).map((r) => [r.id, r])),
    [resolvedRecords, hasSource],
  );

  const columnWidthByProp = useMemo(() => {
    const out: Record<string, number> = {};
    properties.forEach((p) => {
      out[p.id] = draftWidths[p.id] ?? p.width ?? 160;
    });
    return out;
  }, [properties, draftWidths]);

  const columnValuesByProp = useMemo(() => {
    const out: Record<string, unknown[]> = {};
    properties.forEach((p) => {
      out[p.id] = sortedRecords.map((r) => r.values?.[p.id] ?? null);
    });
    return out;
  }, [properties, sortedRecords]);

  const bridgeData: DatabaseBridgeData = useMemo(
    () => ({
      sourceId: attrs.sourceId ?? null,
      properties,
      view: activeView,
      locked,
      templateId: attrs.templateId,
      recordsById,
      columnWidthByProp,
      setCellValue: (recordId, propertyId, value) =>
        setCellValue(recordId, propertyId, value as never),
      columnValuesByProp:
        columnValuesByProp as DatabaseBridgeData["columnValuesByProp"],
    }),
    [
      attrs.sourceId,
      attrs.templateId,
      properties,
      activeView,
      locked,
      recordsById,
      columnWidthByProp,
      columnValuesByProp,
      setCellValue,
    ],
  );

  usePublishDatabaseData(editor, attrs.id ?? null, bridgeData);

  return { recordsById };
}

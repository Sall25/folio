import { useCallback, useMemo } from "react";
import type { Editor } from "@tiptap/core";
import type {
  DatabaseAttrs,
  DataSource,
  ID,
  Page,
  CellValue,
  PropertyType,
  DatabaseProperty,
  DatabaseView,
} from "src/types";
import { insertRecordNode } from "./use-database-seed";
import { NONE_KEY, valueForGroupKey } from "../utils/group-records";
import { canWriteGroupValue } from "../utils/group-key";
import { useWorkspacePeople } from "./use-workspace-people";
import { startingTemplateId } from "../utils/row-templates";
import { placementSeed } from "../utils/view-placement";

export function useRecordCreation({
  editor,
  attrs,
  source,
  activeView,
  groupProp,
  addRecordAsync,
  setCellValue,
  setEditingRecordId,
}: {
  editor: Editor;
  attrs: DatabaseAttrs;
  source: DataSource | null;
  activeView: DatabaseView | undefined;
  groupProp: DatabaseProperty | undefined;
  addRecordAsync: (opts?: {
    title?: string;
    templateId?: string;
    values?: Page["values"];
    defaults?: Page["values"];
  }) => Promise<Page>;
  setCellValue: (
    recordId: string,
    propertyId: string,
    value: CellValue<PropertyType>,
  ) => void;
  setEditingRecordId: (id: ID) => void;
}) {
  // A new row in a person group gets that person (with their name).
  const people = useWorkspacePeople();
  const personName = useMemo(() => {
    const names = new Map(people.map((p) => [p.id, p.name] as const));
    return (id: string) => names.get(id);
  }, [people]);

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

  // New rows start from the default template, when there is one, and on
  // today where the view places records by a date — otherwise a page made
  // from a timeline or a calendar is created off-screen and the button
  // looks like it did nothing. Passed as defaults, not values: a template
  // that set that date meant it and keeps it.
  const newRecordOpts = useCallback(() => {
    const templateId = startingTemplateId(source);
    const base = templateId ? { templateId } : { title: "" };
    const seed = placementSeed(
      activeView,
      source?.properties ?? [],
      new Date(),
    );
    return seed ? { ...base, defaults: seed } : base;
  }, [source, activeView]);

  const onNewRecord = useCallback(() => {
    addRecordAsync(newRecordOpts())
      .then((page) => {
        insertNode(page);
        setEditingRecordId(page.id);
      })
      .catch((error) => console.error("Failed to create page", error));
  }, [addRecordAsync, insertNode, setEditingRecordId, newRecordOpts]);

  const onNewRecordInGroup = useCallback(
    (groupKey: string) => {
      // The column's value goes over the template's.
      addRecordAsync(newRecordOpts())
        .then((page) => {
          insertNode(page);
          // Computed groups (formula, rollup, created by…) can't be set.
          if (
            groupProp &&
            groupKey !== NONE_KEY &&
            canWriteGroupValue(groupProp)
          ) {
            setCellValue(
              page.id,
              groupProp.id,
              valueForGroupKey(groupKey, groupProp, { personName }) as never,
            );
          }
          setEditingRecordId(page.id);
        })
        .catch((error) => console.error("Failed to create page", error));
    },
    [
      addRecordAsync,
      newRecordOpts,
      insertNode,
      setCellValue,
      groupProp,
      setEditingRecordId,
      personName,
    ],
  );

  return { onNewRecord, onNewRecordInGroup };
}

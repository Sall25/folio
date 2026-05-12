/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback } from "react";
import type { Editor } from "@tiptap/core";
import type { ID, PropertyType, DatabaseProperty } from "../types/types";
import type { FilterRule } from "../types/filter-types";

export function useDatabaseProperties(nodeId: ID, editor: Editor) {
  const addProperty = useCallback(
    (type: PropertyType) => {
      editor.commands.addDatabaseProperty(nodeId, type);
    },
    [editor, nodeId],
  );

  const deleteProperty = useCallback(
    (propertyId: ID) => {
      editor.commands.deleteDatabaseProperty(nodeId, propertyId);
    },
    [editor, nodeId],
  );

  const updateProperty = useCallback(
    (propertyId: ID, patch: Partial<Omit<DatabaseProperty, "id">>) => {
      editor.commands.updateDatabaseProperty(nodeId, propertyId, patch);
    },
    [editor, nodeId],
  );

  const reorderProperties = useCallback(
    (orderedIds: ID[]) => {
      editor.commands.reorderDatabaseProperties(nodeId, orderedIds);
    },
    [editor, nodeId],
  );

  const duplicateProperty = useCallback(
    (propertyId: ID) => {
      editor.commands.duplicateDatabaseProperty(nodeId, propertyId);
    },
    [editor, nodeId],
  );

  const freezeProperty = useCallback(
    (viewId: ID, propertyId: ID | null) => {
      editor.commands.freezeDatabaseProperty(nodeId, viewId, propertyId);
    },
    [editor, nodeId],
  );

  const toggleUnwrapProperty = useCallback(
    (viewId: ID, propertyId: ID) => {
      editor.commands.toggleUnwrapProperty(nodeId, viewId, propertyId);
    },
    [editor, nodeId],
  );

  const hideProperty = useCallback(
    (viewId: ID, propertyId: ID) => {
      editor.commands.hideProperty(nodeId, viewId, propertyId);
    },
    [editor, nodeId],
  );

  const showProperty = useCallback(
    (viewId: ID, propertyId: ID) => {
      editor.commands.showProperty(nodeId, viewId, propertyId);
    },
    [editor, nodeId],
  );

  const sortByProperty = useCallback(
    (viewId: ID, propertyId: ID, direction: "asc" | "desc") => {
      editor.commands.sortByProperty(nodeId, viewId, propertyId, direction);
    },
    [editor, nodeId],
  );

  const removeSortByProperty = useCallback(
    (viewId: ID, propertyId: ID) => {
      editor.commands.removeSortByProperty(nodeId, viewId, propertyId);
    },
    [editor, nodeId],
  );

  const filterByProperty = useCallback(
    (viewId: ID, rule: FilterRule) => {
      editor.commands.filterByProperty(nodeId, viewId, rule);
    },
    [editor, nodeId],
  );

  const groupByProperty = useCallback(
    (viewId: ID, propertyId: ID) => {
      editor.commands.groupByProperty(nodeId, viewId, propertyId);
    },
    [editor, nodeId],
  );

  const isFrozen = useCallback(
    (viewId: ID, propertyId: ID): boolean => {
      let frozen = false;
      editor.state.doc.descendants((node) => {
        if (node.type.name !== "database" || node.attrs.id !== nodeId) return;
        const view = node.attrs.views.find((v: any) => v.id === viewId);
        if (view?.frozenPropertyId === propertyId) frozen = true;
        return false;
      });
      return frozen;
    },
    [editor, nodeId],
  );

  const isUnwrapped = useCallback(
    (viewId: ID, propertyId: ID): boolean => {
      let unwrapped = false;
      editor.state.doc.descendants((node) => {
        if (node.type.name !== "database" || node.attrs.id !== nodeId) return;
        const view = node.attrs.views.find((v: any) => v.id === viewId);
        if (view?.unwrappedProperties?.includes(propertyId)) unwrapped = true;
        return false;
      });
      return unwrapped;
    },
    [editor, nodeId],
  );

  return {
    addProperty,
    deleteProperty,
    updateProperty,
    reorderProperties,
    duplicateProperty,
    freezeProperty,
    toggleUnwrapProperty,
    hideProperty,
    showProperty,
    sortByProperty,
    removeSortByProperty,
    filterByProperty,
    groupByProperty,
    isFrozen,
    isUnwrapped,
  };
}

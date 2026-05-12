import { useState, useCallback, useMemo } from "react";
import type { Editor } from "@tiptap/core";
import type {
  DatabaseAttrs,
  DatabaseView,
  ID,
  CellAddress,
  PanelView,
  DatabaseUIState,
} from "../types/types";

export type UseDatabaseUIReturn = ReturnType<typeof useDatabaseUI>;

export function useDatabaseUI(attrs: DatabaseAttrs, editor: Editor) {
  const nodeId = attrs.id;

  // ── Ephemeral UI state ─────────────────────────────────────────────────

  const [uiState, setUIState] = useState<DatabaseUIState>({
    editingCell: null,
    openRecordId: null,
    openPropertyId: null,
    searchQuery: "",
    panelStack: [{ type: "main" }],
  });

  const patchUI = useCallback(
    (patch: Partial<DatabaseUIState>) =>
      setUIState((prev) => ({ ...prev, ...patch })),
    [],
  );

  // ── Derived ────────────────────────────────────────────────────────────

  const activeView = useMemo(
    () =>
      attrs.views.find((v) => v.id === attrs.activeViewId) ??
      attrs.views[0] ??
      null,
    [attrs.views, attrs.activeViewId],
  );

  const currentPanel: PanelView =
    uiState.panelStack[uiState.panelStack.length - 1];

  // ── Cell editing ───────────────────────────────────────────────────────

  const setEditingCell = useCallback(
    (cell: CellAddress | null) => patchUI({ editingCell: cell }),
    [patchUI],
  );

  const isCellEditing = useCallback(
    (recordId: ID, propertyId: ID) =>
      uiState.editingCell?.recordId === recordId &&
      uiState.editingCell?.propertyId === propertyId,
    [uiState.editingCell],
  );

  // ── Record / property popups ───────────────────────────────────────────

  const setOpenRecordId = useCallback(
    (id: ID | null) => patchUI({ openRecordId: id, editingCell: null }),
    [patchUI],
  );

  const setOpenPropertyId = useCallback(
    (id: ID | null) =>
      patchUI({ openPropertyId: id, panelStack: [{ type: "main" }] }),
    [patchUI],
  );

  // ── Search ─────────────────────────────────────────────────────────────

  const setSearchQuery = useCallback(
    (q: string) => patchUI({ searchQuery: q }),
    [patchUI],
  );

  // ── Panel stack ────────────────────────────────────────────────────────

  const pushPanel = useCallback(
    (view: PanelView) =>
      setUIState((prev) => ({
        ...prev,
        panelStack: [...prev.panelStack, view],
      })),
    [],
  );

  const popPanel = useCallback(
    () =>
      setUIState((prev) => ({
        ...prev,
        panelStack:
          prev.panelStack.length > 1
            ? prev.panelStack.slice(0, -1)
            : prev.panelStack,
      })),
    [],
  );

  const resetPanel = useCallback(
    () => patchUI({ panelStack: [{ type: "main" }] }),
    [patchUI],
  );

  // ── View mutations (persisted into ProseMirror attrs) ──────────────────

  const setActiveView = useCallback(
    (viewId: ID) => {
      editor.commands.updateDatabaseAttrs(nodeId, { activeViewId: viewId });
    },
    [editor, nodeId],
  );

  const addView = useCallback(
    (type: DatabaseView["type"], name: string) => {
      editor.commands.addDatabaseView(nodeId, type, name);
    },
    [editor, nodeId],
  );

  const updateView = useCallback(
    (viewId: ID, patch: Partial<Omit<DatabaseView, "id" | "type">>) => {
      editor.commands.updateDatabaseView(nodeId, viewId, patch);
    },
    [editor, nodeId],
  );

  const deleteView = useCallback(
    (viewId: ID) => {
      editor.commands.deleteDatabaseView(nodeId, viewId);
    },
    [editor, nodeId],
  );

  return {
    // Derived
    activeView,
    currentPanel,

    // Ephemeral state (read)
    editingCell: uiState.editingCell,
    openRecordId: uiState.openRecordId,
    openPropertyId: uiState.openPropertyId,
    searchQuery: uiState.searchQuery,

    // Cell editing
    setEditingCell,
    isCellEditing,

    // Record / property popups
    setOpenRecordId,
    setOpenPropertyId,

    // Search
    setSearchQuery,

    // Panel navigation
    pushPanel,
    popPanel,
    resetPanel,

    // View mutations
    setActiveView,
    addView,
    updateView,
    deleteView,
  };
}

import { useRef, useState, useCallback, useEffect } from "react";
import type { Editor } from "@tiptap/core";
import type { SimpleEditorContentProps, SaveState } from "src/types";

export function useEditorSave({
  updatePageAsync,
  activePage,
  onDeleteCache,
}: Pick<SimpleEditorContentProps, "updatePageAsync" | "activePage"> & {
  onDeleteCache: () => void;
}) {
  const isReady = useRef(false);
  const isDirty = useRef(false);
  const savingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("saved");

  const save = useCallback(
    (editor: Editor) => {
      if (!editor || !isReady.current || !isDirty.current) return;
      setSaveState("saving");
      onDeleteCache();
      updatePageAsync({ ...activePage, content: editor.getJSON() });
      isDirty.current = false;
      if (savingTimerRef.current) clearTimeout(savingTimerRef.current);
      savingTimerRef.current = setTimeout(() => setSaveState("saved"), 600);
    },
    [updatePageAsync, activePage, onDeleteCache],
  );

  const onDirtyChanged = useCallback((v: boolean) => {
    isDirty.current = v;
  }, []);

  const onIsReadyChanged = useCallback((v: boolean) => {
    isReady.current = v;
  }, []);

  // Cleanup
  useEffect(
    () => () => {
      if (savingTimerRef.current) clearTimeout(savingTimerRef.current);
    },
    [],
  );

  return {
    save,
    saveState,
    setSaveState,
    isReady,
    onDirtyChanged,
    onIsReadyChanged,
    savingTimerRef,
  };
}

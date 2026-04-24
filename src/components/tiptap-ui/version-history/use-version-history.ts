import { useState, useCallback, useMemo } from "react";
import { useSimpleEditor } from "src/components/tiptap-templates/simple/context/simple-editor-context";
import type { Version } from "./types";

export function useVersionHistory() {
  const {
    activePage,
    updatePageAsync,
    versions,
    nameVersionAsync,
    createVersionAsync,
  } = useSimpleEditor();

  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [namingVersionId, setNamingVersionId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");

  // Snapshot current content when sidebar opens so we can restore on cancel
  const currentContent = useMemo(() => {
    if (selectedVersion === null) return undefined;
    return activePage?.content;
  }, [activePage?.content, selectedVersion]);

  const selectVersion = useCallback((version: Version | null) => {
    setSelectedVersion(version);
    setNamingVersionId(null);
    setNameInput("");
  }, []);

  const startNaming = useCallback((versionId: string) => {
    setNamingVersionId(versionId);
    setNameInput("");
  }, []);

  const cancelNaming = useCallback(() => {
    setNamingVersionId(null);
    setNameInput("");
  }, []);

  const saveNameAsync = useCallback(
    async (versionId: string) => {
      if (!nameInput.trim()) return;
      await nameVersionAsync({ id: versionId, name: nameInput.trim() });
      setNamingVersionId(null);
      setNameInput("");
    },
    [nameVersionAsync, nameInput],
  );

  const restoreVersionAsync = useCallback(async () => {
    if (!selectedVersion || !activePage) return;
    await updatePageAsync({
      ...activePage,
      title: selectedVersion.title,
      content: selectedVersion.content,
    });
    setSelectedVersion(null);
  }, [selectedVersion, activePage, updatePageAsync]);

  const createNamedVersionAsync = useCallback(
    async (name: string) => {
      if (!activePage) return;
      await createVersionAsync({
        pageId: activePage.id,
        title: activePage.title,
        content: activePage.content,
        isNamed: true,
        name,
      });
    },
    [activePage, createVersionAsync],
  );

  return {
    versions,
    selectedVersion,
    isCurrentVersion: selectedVersion === null,
    selectVersion,
    currentContent: currentContent,
    namingVersionId,
    nameInput,
    setNameInput,
    startNaming,
    cancelNaming,
    saveNameAsync,
    restoreVersionAsync,
    createNamedVersionAsync,
  };
}

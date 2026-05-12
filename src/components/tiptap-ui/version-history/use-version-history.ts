// use-version-history.ts
import { useState, useCallback, useEffect, useRef } from "react";
import type { Version } from "./types";
import type {
  Page,
  PageSettings,
} from "src/components/tiptap-templates/simple/types";
import { useVersions } from "./use-versions";

export function useVersionHistory(
  activePage: Page | null,
  updatePageAsync: (page: Page) => Promise<Page>,
) {
  // No longer calls useActivePage — receives values as args
  const { versions, nameVersionAsync, createVersionAsync } = useVersions(
    activePage?.id,
  );

  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [namingVersionId, setNamingVersionId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");

  // Ref to skip effect on mount and page navigation
  const isFirstRender = useRef(true);

  // Reset on page change
  useEffect(() => {
    isFirstRender.current = true;
    setSelectedVersion(null);
    setNamingVersionId(null);
    setNameInput("");
  }, [activePage?.id]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!activePage) return;

    const settings: PageSettings = {
      ...activePage.settings,
      locked: selectedVersion !== null,
    };
    updatePageAsync({ ...activePage, settings });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVersion]);

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
      await nameVersionAsync({ id: Number(versionId), name: nameInput.trim() });
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
    namingVersionId,
    nameInput,
    setNameInput,
    startNaming,
    cancelNaming,
    saveNameAsync,
    restoreVersionAsync,
    createNamedVersionAsync,
    createVersionAsync,
  };
}

// use-version-history.ts
import { useState, useCallback, useEffect, useRef } from "react";
import type { Version } from "src/types";
import type { Page, PageSettings } from "src/types";
import { useVersionsByPage } from "src/hooks/use-versions";
import { usePatchVersion } from "src/hooks/use-patch-version";
import { patchVersion } from "src/api/versions";
import { useCreateVersion } from "src/hooks/use-create-version";
import { usePatchPage } from "src/hooks/use-patch-page";
import { patchPage } from "src/api/pages";
import { makeVersion, makeVersionFromPage } from "src/utils/make-version";

export function useVersionHistory(activePage: Page | null) {
  const { data: versions } = useVersionsByPage(activePage?.id ?? null);
  const mutateVersion = usePatchVersion(({ id, patch }) =>
    patchVersion(id, patch),
  );
  const createVersion = useCreateVersion();

  const mutatePage = usePatchPage(({ id, patch }) => patchPage(id, patch));

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
    mutatePage.mutateAsync({ id: activePage.id, patch: { settings } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVersion, mutatePage]);

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
      await mutateVersion.mutateAsync({
        id: versionId,
        patch: { name: nameInput.trim() },
      });
      setNamingVersionId(null);
      setNameInput("");
    },
    [mutateVersion, nameInput],
  );

  const restoreVersionAsync = useCallback(async () => {
    if (!selectedVersion || !activePage) return;
    await mutatePage.mutateAsync({
      id: activePage.id,
      patch: {
        title: selectedVersion.title,
        content: selectedVersion.content ?? undefined,
      },
    });
    setSelectedVersion(null);
  }, [selectedVersion, activePage, mutatePage]);

  const createVersionAsync = useCallback(async () => {
    if (!activePage) return;
    const version = makeVersion({
      pageId: activePage.id,
      title: activePage.title,
      content: activePage.content,
    });
    await createVersion.mutateAsync(version);
    return version;
  }, [activePage, createVersion]);

  const createNamedVersionAsync = useCallback(
    async (name: string) => {
      if (!activePage) return;
      const version = makeVersionFromPage(activePage, { name });
      await createVersion.mutateAsync(version);
      return version;
    },
    [activePage, createVersion],
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

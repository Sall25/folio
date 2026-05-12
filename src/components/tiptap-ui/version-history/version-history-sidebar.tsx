import { useEffect, useRef, useState } from "react";
import { Timer, X } from "lucide-react";
import "./version-history.scss";
import { VersionHistoryList } from "./version-history-list";
import { useVersionHistory } from "./use-version-history";
import { useDiff } from "./use-diff";
import type { Version } from "./types";
import { useSimpleEditor } from "src/components/tiptap-templates/simple/context/simple-editor-context";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { useCurrentEditor } from "@tiptap/react";

interface VersionHistorySidebarProps {
  open: boolean;
  onClose: () => void;
  userColor?: string;
}

// Shell — no hooks, mounts inner only when open
export function VersionHistorySidebar({
  open,
  onClose,
  userColor,
}: VersionHistorySidebarProps) {
  if (!open) return null;
  return <VersionHistorySidebarInner onClose={onClose} userColor={userColor} />;
}

// Inner — all hooks live here, only runs when sidebar is open
function VersionHistorySidebarInner({
  onClose,
  userColor,
}: {
  onClose: () => void;
  userColor?: string;
}) {
  const { activePage, updatePageAsync } = useSimpleEditor();
  const {
    versions,
    selectedVersion,
    selectVersion,
    namingVersionId,
    nameInput,
    setNameInput,
    startNaming,
    cancelNaming,
    saveNameAsync,
    restoreVersionAsync,
    createVersionAsync,
  } = useVersionHistory(activePage, updatePageAsync);

  const { editor } = useCurrentEditor();
  const { applyDiff, clearDiff } = useDiff(editor);
  const [filter, setFilter] = useState<"all" | "named">("all");

  const activePageRef = useRef(activePage);
  const createVersionAsyncRef = useRef(createVersionAsync);

  useEffect(() => {
    activePageRef.current = activePage;
  }, [activePage]);

  useEffect(() => {
    createVersionAsyncRef.current = createVersionAsync;
  }, [createVersionAsync]);

  const filteredVersions =
    filter === "named" ? versions.filter((v) => v.isNamed) : versions;

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(selectedVersion === null);
  }, [editor, selectedVersion]);

  useEffect(() => {
    return () => {
      editor?.setEditable(true);
      clearDiff();
    };
  }, [editor, clearDiff]);

  useEffect(() => {
    if (!editor) return;

    const update = () => {
      if (!activePageRef.current) return;
      const now = Date.now();
      const VERSION_INTERVAL = 10 * 60 * 1000;
      if (now - Date.now() >= VERSION_INTERVAL) {
        createVersionAsyncRef.current({
          pageId: activePageRef.current.id,
          title: activePageRef.current.title,
          content: activePageRef.current.content,
          isNamed: false,
        });
      }
    };

    editor.on("update", update);
    return () => {
      editor.off("update", update);
    };
  }, [editor]);

  const handleSelect = async (version: Version | null) => {
    selectVersion(version);
    if (!editor || !activePage) return;

    if (version === null) {
      clearDiff();
      if (activePage.content) {
        editor.commands.setContent(activePage.content);
      }
      return;
    }

    editor.commands.setContent(version.content);
    if (activePage.content) {
      applyDiff(version.content, activePage.content, userColor);
    }
  };

  const handleRestore = async () => {
    clearDiff();
    await restoreVersionAsync();
    onClose();
  };

  const handleClose = async () => {
    if (selectedVersion && editor && activePage) {
      clearDiff();
      if (activePage.content) {
        editor.commands.setContent(activePage.content);
      }
    }
    editor?.setEditable(true);
    selectVersion(null);
    onClose();
  };

  return (
    <div className="vh-sidebar">
      <div className="vh-sidebar__inner">
        <div className="vh-sidebar__header">
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
              <Timer size={18} />
              <span className="vh-sidebar__title">Version history</span>
            </div>
            <Spacer orientation="horizontal" />
            <Button variant="ghost" onClick={handleClose}>
              <X size={16} />
            </Button>
          </div>
          <div style={{ width: "100%" }}>
            <select
              className="vh-filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value as "all" | "named")}
            >
              <option value="all">All versions</option>
              <option value="named">Named versions</option>
            </select>
          </div>
        </div>

        {selectedVersion && (
          <div className="vh-sidebar__restore-bar">
            <span className="vh-sidebar__restore-info">
              Previewing a version
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                className="vh-btn vh-btn--primary"
                onClick={handleRestore}
              >
                Restore
              </button>
              <button className="vh-btn" onClick={() => handleSelect(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <VersionHistoryList
          versions={filteredVersions}
          selectedVersion={selectedVersion}
          namingVersionId={namingVersionId}
          nameInput={nameInput}
          onSelect={handleSelect}
          onStartNaming={startNaming}
          onCancelNaming={cancelNaming}
          onSaveNameAsync={saveNameAsync}
          onNameInputChange={setNameInput}
        />
      </div>
    </div>
  );
}

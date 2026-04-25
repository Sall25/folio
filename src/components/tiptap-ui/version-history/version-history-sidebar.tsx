import { useEffect, useState } from "react";
import { Timer, X } from "lucide-react";
import "./version-history.scss";
import { VersionHistoryList } from "./version-history-list";
import { useVersionHistory } from "./use-version-history";
import { useDiff } from "./use-diff";
import type { Editor } from "@tiptap/react";
import type { Version } from "./types";
import type { Page } from "src/components/tiptap-templates/simple/types";
import { useSimpleEditor } from "src/components/tiptap-templates/simple/context/simple-editor-context";
import { Button, ButtonGroup } from "src/components/tiptap-ui-primitive/button";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";

interface VersionHistorySidebarProps {
  open: boolean;
  onClose: () => void;
  editor: Editor | null;
  userColor?: string;
  startVersionPreview: () => void;
  endVersionPreview: () => void;
  currentContent?: Page["content"];
}

export function VersionHistorySidebar({
  open,
  onClose,
  editor,
  userColor,
  startVersionPreview,
  endVersionPreview,
}: VersionHistorySidebarProps) {
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
  } = useVersionHistory();
  const { activePage } = useSimpleEditor();
  const { applyDiff, clearDiff } = useDiff(editor);
  const [filter, setFilter] = useState<"all" | "named">("all");

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

  if (!open) return null;

  const handleSelect = async (version: Version | null) => {
    selectVersion(version);
    if (!editor) return;
    if (!activePage) return;

    if (version === null) {
      endVersionPreview();
      clearDiff();
      // Just read from activePage — it was never touched
      if (activePage.content) {
        editor.commands.setContent(activePage.content);
      }
      return;
    }

    startVersionPreview();
    editor.commands.setContent(version.content);
    if (activePage?.content)
      applyDiff(version.content, activePage?.content, userColor);
  };

  const handleRestore = async () => {
    clearDiff();
    await restoreVersionAsync();
    onClose();
  };

  const handleClose = async () => {
    if (selectedVersion && editor && activePage) {
      clearDiff();
      endVersionPreview();
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

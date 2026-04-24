import { Timer, X } from "lucide-react";
import "./version-history.scss";
import { VersionHistoryList } from "./version-history-list";
import { useVersionHistory } from "./use-version-history";
import type { Editor } from "@tiptap/react";

interface VersionHistorySidebarProps {
  open: boolean;
  onClose: () => void;
  editor: Editor | null;
}

export function VersionHistorySidebar({
  open,
  onClose,
  editor,
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
    currentContent,
  } = useVersionHistory();

  if (!open) return null;

  const handleSelect = (version: typeof selectedVersion) => {
    selectVersion(version);
    if (!editor) return;
    if (version === null) {
      // Back to current — restore original content
      if (currentContent) editor.commands.setContent(currentContent);
    } else {
      editor.commands.setContent(version.content);
    }
  };

  const handleRestore = async () => {
    await restoreVersionAsync();
    onClose();
  };

  const handleClose = () => {
    // Restore current content on close if previewing a version
    if (selectedVersion && editor) {
      if (currentContent) editor.commands.setContent(currentContent);
    }
    selectVersion(null);
    onClose();
  };

  return (
    <div className="vh-sidebar">
      <div className="vh-sidebar__header">
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
          }}
        >
          <Timer size={16} />
          <span className="vh-sidebar__title">Version history</span>
        </span>
        <button className="vh-icon-btn" onClick={handleClose}>
          <X size={16} />
        </button>
      </div>

      {selectedVersion && (
        <div className="vh-sidebar__restore-bar">
          <span className="vh-sidebar__restore-info">Previewing a version</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="vh-btn vh-btn--primary" onClick={handleRestore}>
              Restore
            </button>
            <button className="vh-btn" onClick={() => handleSelect(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <VersionHistoryList
        versions={versions}
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
  );
}

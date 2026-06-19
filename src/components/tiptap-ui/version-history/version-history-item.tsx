import { Badge } from "src/components/tiptap-ui-primitive/badge";
import type { Version } from "src/types";
import { formatVersionTime } from "./utils";

interface VersionHistoryItemProps {
  version: Version;
  isSelected: boolean;
  isNaming: boolean;
  nameInput: string;
  onSelect: () => void;
  onStartNaming: () => void;
  onCancelNaming: () => void;
  onSaveNameAsync: () => Promise<void>;
  onNameInputChange: (value: string) => void;
}

export function VersionHistoryItem({
  version,
  isSelected,
  isNaming,
  nameInput,
  onSelect,
  onStartNaming,
  onCancelNaming,
  onSaveNameAsync,
  onNameInputChange,
}: VersionHistoryItemProps) {
  return (
    <div
      className={`vh-item ${isSelected ? "vh-item--selected" : ""}`}
      onClick={onSelect}
    >
      <div className="vh-item__header">
        <span className="vh-item__time">
          {formatVersionTime(version.createdAt)}
        </span>
        {version.name && <Badge data-style="gray">{version.name}</Badge>}
      </div>

      <div className="vh-item__meta">
        {version.name ? "Named version" : "Auto-saved"}
      </div>

      {isSelected && (
        <div className="vh-item__actions" onClick={(e) => e.stopPropagation()}>
          {isNaming ? (
            <div className="vh-item__name-row">
              <input
                autoFocus
                className="vh-input"
                value={nameInput}
                onChange={(e) => onNameInputChange(e.target.value)}
                placeholder="Version name…"
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSaveNameAsync();
                  if (e.key === "Escape") onCancelNaming();
                }}
              />
              <button
                className="vh-btn vh-btn--primary"
                onClick={onSaveNameAsync}
              >
                Save
              </button>
              <button className="vh-btn" onClick={onCancelNaming}>
                Cancel
              </button>
            </div>
          ) : (
            <button className="vh-btn" onClick={onStartNaming}>
              {version.name ? "Rename" : "Name this version"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

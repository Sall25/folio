import type { Version } from "./types";
import { VersionHistoryItem } from "./version-history-item";
import { groupVersionsByDate } from "./utils";

interface VersionHistoryListProps {
  versions: Version[];
  selectedVersion: Version | null;
  namingVersionId: string | null;
  nameInput: string;
  onSelect: (version: Version | null) => void;
  onStartNaming: (versionId: string) => void;
  onCancelNaming: () => void;
  onSaveNameAsync: (versionId: string) => Promise<void>;
  onNameInputChange: (value: string) => void;
}

export function VersionHistoryList({
  versions,
  selectedVersion,
  namingVersionId,
  nameInput,
  onSelect,
  onStartNaming,
  onCancelNaming,
  onSaveNameAsync,
  onNameInputChange,
}: VersionHistoryListProps) {
  const groups = groupVersionsByDate(versions);

  return (
    <div className="vh-list">
      {/* Current version entry */}
      <div className="vh-group-label">Current</div>
      <div
        className={`vh-item ${selectedVersion === null ? "vh-item--selected" : ""}`}
        onClick={() => onSelect(null)}
      >
        <div className="vh-item__header">
          <span className="vh-item__time">Now</span>
          <span className="vh-item__badge vh-item__badge--current">Live</span>
        </div>
        <div className="vh-item__meta">Current version</div>
      </div>

      {groups.map((group) => (
        <div key={group.label}>
          <div className="vh-group-label">{group.label}</div>
          {group.versions.map((version) => (
            <VersionHistoryItem
              key={version.id}
              version={version}
              isSelected={selectedVersion?.id === version.id}
              isNaming={namingVersionId === version.id}
              nameInput={nameInput}
              onSelect={() => onSelect(version)}
              onStartNaming={() => onStartNaming(version.id)}
              onCancelNaming={onCancelNaming}
              onSaveNameAsync={() => onSaveNameAsync(version.id)}
              onNameInputChange={onNameInputChange}
            />
          ))}
        </div>
      ))}

      {versions.length === 0 && (
        <p className="vh-empty">
          No versions yet. Versions are created automatically every 10 minutes
          of editing.
        </p>
      )}
    </div>
  );
}

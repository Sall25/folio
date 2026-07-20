import { useEffect, useRef, useState } from "react";
import type { StatusColor, StatusItem } from "./types";
import { STATUS_COLORS } from "./config";
import { StatusPill } from "./status-pill";

interface StatusEditModalProps {
  item: StatusItem | null;
  groupId: string | null;
  onSave: (groupId: string, item: StatusItem) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function StatusEditModal({
  item,
  groupId,
  onSave,
  onDelete,
  onClose,
}: StatusEditModalProps) {
  const isNew = item === null;
  const [name, setName] = useState(item?.name ?? "");
  const [color, setColor] = useState<StatusColor>(item?.color ?? "gray");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [item]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed || !groupId) return;
    onSave(groupId, {
      id: item?.id ?? crypto.randomUUID(),
      name: trimmed,
      color,
      isDefault: item?.isDefault,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") onClose();
  };

  // const c = getColor(color);

  return (
    <div className="sp-modal-backdrop" onMouseDown={onClose}>
      <div className="sp-modal" onMouseDown={(e) => e.stopPropagation()}>
        <p className="sp-modal-section-label">
          {isNew ? "New status" : "Edit status"}
        </p>

        <div className="sp-modal-preview">
          <StatusPill name={name || "Status"} color={color} />
        </div>

        <input
          ref={inputRef}
          className="sp-modal-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Status name"
        />

        <p className="sp-modal-section-label">Color</p>
        <div className="sp-color-grid">
          {STATUS_COLORS.map((c) => (
            <button
              key={c.id}
              className={`sp-color-swatch ${color === c.id ? "sp-color-swatch--active" : ""}`}
              style={{ background: `var(--tt-color-text-${c.id})` }}
              onClick={() => setColor(c.id)}
              aria-label={c.id}
            />
          ))}
        </div>

        <div className="sp-modal-actions">
          {!isNew && !item?.isDefault && (
            <button
              className="sp-btn sp-btn--danger"
              onClick={() => item && onDelete(item.id)}
            >
              Delete
            </button>
          )}
          <div className="sp-modal-actions-right">
            <button className="sp-btn sp-btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="sp-btn sp-btn--primary" onClick={handleSave}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

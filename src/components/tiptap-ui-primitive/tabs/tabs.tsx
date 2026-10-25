import { useState, type ReactNode } from "react";
import { Plus, X } from "src/components/icons";
import "./tabs.scss";

// ── TabList: the row container ───────────────────────────────────────────────
export interface TabListProps {
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
}

export function TabList({ children, className, ...rest }: TabListProps) {
  return (
    <div
      role="tablist"
      className={["tab-list", className].filter(Boolean).join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
}

// ── TabItem: a single tab ────────────────────────────────────────────────────
export interface TabItemProps {
  label: string;
  active?: boolean;
  icon?: ReactNode;
  onSelect?: () => void;
  /** when provided, shows a close (×) button */
  onClose?: () => void;
  /** when provided, double-click renames inline; commits on blur / Enter */
  onRename?: (value: string) => void;
  closeLabel?: string;
  className?: string;
  /** Optional drag-to-reorder: the list handles the drop. */
  draggable?: boolean;
  onDragStart?: React.DragEventHandler<HTMLDivElement>;
  onDragOver?: React.DragEventHandler<HTMLDivElement>;
  onDrop?: React.DragEventHandler<HTMLDivElement>;
  onDragEnd?: React.DragEventHandler<HTMLDivElement>;
  /** Extra keys while the tab has focus (e.g. Alt+Arrow to move it). */
  onKeyDownExtra?: React.KeyboardEventHandler<HTMLDivElement>;
}

export function TabItem({
  label,
  active,
  icon,
  onSelect,
  onClose,
  onRename,
  closeLabel = "Remove tab",
  className,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onKeyDownExtra,
}: TabItemProps) {
  const [editing, setEditing] = useState(false);

  return (
    <div
      role="tab"
      aria-selected={!!active}
      tabIndex={0}
      className={["tab-item", active && "is-active", className]
        .filter(Boolean)
        .join(" ")}
      onClick={() => {
        if (!editing) onSelect?.();
      }}
      draggable={draggable && !editing}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onDoubleClick={() => {
        if (onRename) setEditing(true);
      }}
      onKeyDown={(e) => {
        if (editing) return;
        onKeyDownExtra?.(e);
        if (e.defaultPrevented) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.();
        }
      }}
    >
      {icon && <span className="tab-item__icon">{icon}</span>}

      {editing && onRename ? (
        <input
          className="tab-item__input"
          autoFocus
          defaultValue={label}
          onClick={(e) => e.stopPropagation()}
          onBlur={(e) => {
            onRename(e.target.value);
            setEditing(false);
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") setEditing(false);
          }}
        />
      ) : (
        <span className="tab-item__label">{label || "Tab"}</span>
      )}

      {onClose && (
        <button
          type="button"
          className="tab-item__close"
          aria-label={closeLabel}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}

// ── TabAddButton: the "+" ────────────────────────────────────────────────────
export interface TabAddButtonProps {
  onClick?: () => void;
  icon?: ReactNode;
  className?: string;
  "aria-label"?: string;
}

export function TabAddButton({
  onClick,
  icon,
  className,
  "aria-label": ariaLabel = "Add tab",
}: TabAddButtonProps) {
  return (
    <button
      type="button"
      className={["tab-add", className].filter(Boolean).join(" ")}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      {icon ?? <Plus size={15} />}
    </button>
  );
}

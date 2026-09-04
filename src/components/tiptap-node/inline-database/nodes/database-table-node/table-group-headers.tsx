import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Chevron } from "src/components/tiptap-ui-primitive/chevron";
import { SpinnerRing } from "src/components/tiptap-ui-primitive/spinner-ring";
import type { GroupHeaderSlot } from "../../utils/group-rows";
import "./table-group-headers.scss";

export function TableGroupHeaders({
  headers,
  collapsedKeys,
  onToggle,
  onNewInGroup,
}: {
  headers: GroupHeaderSlot[];
  collapsedKeys: Set<string>;
  onToggle: (key: string) => void;
  onNewInGroup: (key: string) => void;
}) {
  // The group mid-toggle: show a ring on its chevron until the collapse has
  // actually applied AND painted, so the click feels instant whether the lag
  // is the state round-trip or the grid reflow.
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const handleToggle = (key: string) => {
    setPendingKey(key);
    onToggle(key);
  };

  // Clear after the collapsed layout has painted (double rAF = after the next
  // paint), so the ring spans the reflow, not just the state update.
  useEffect(() => {
    if (pendingKey === null) return;
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setPendingKey(null)),
    );
    return () => cancelAnimationFrame(raf);
  }, [collapsedKeys, pendingKey]);

  return (
    <>
      {headers.map((h) => {
        const expanded = !collapsedKeys.has(h.key);
        const pending = pendingKey === h.key;
        return (
          <div
            key={h.key}
            className="db-group-header"
            style={{ gridColumn: "1 / -1", gridRow: h.row, border: "none" }}
            contentEditable={false}
            onClick={() => handleToggle(h.key)}
          >
            {pending ? (
              <SpinnerRing size={16} className="db-group-header__ring" />
            ) : (
              <Chevron
                expanded={expanded}
                size="large"
                aria-label={expanded ? "Collapse group" : "Expand group"}
              />
            )}
            <Button
              variant="ghost"
              data-highlighted="true"
              style={{ background: "transparent" }}
            >
              <span className="tiptap-button-text">{h.label}</span>
            </Button>
          </div>
        );
      })}

      {headers.map((h) => {
        const expanded = !collapsedKeys.has(h.key);
        return expanded ? (
          <div
            key={`new-${h.key}`}
            className="db-group-new"
            style={{ gridColumn: "1 / -1", gridRow: h.newRow }}
            contentEditable={false}
          >
            <Button variant="ghost" onClick={() => onNewInGroup(h.key)}>
              <Plus className="tiptap-button-icon" />
              <span className="tiptap-button-text">New page</span>
            </Button>
          </div>
        ) : null;
      })}
    </>
  );
}

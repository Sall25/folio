import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Chevron } from "src/components/tiptap-ui-primitive/chevron";
import { SpinnerRing } from "src/components/tiptap-ui-primitive/spinner-ring";
import type { GroupHeaderSlot } from "../utils/group-rows";
import "./group-headers.scss";

export function GroupHeaders({
  headers,
  collapsedKeys,
  onToggle,
  onNewInGroup,
  classPrefix = "db-group",
}: {
  /** Union type — this component only reads base fields (key/label/row/newRow),
   *  never columnsRow, so it works for both table and list slots. */
  headers: GroupHeaderSlot[];
  collapsedKeys: Set<string>;
  onToggle: (key: string) => void;
  onNewInGroup: (key: string) => void;
  /** Class prefix so table and list can style their group chrome separately:
   *  "db-group" (table) → .db-group-header / .db-group-new
   *  "db-list-group" (list) → .db-list-group-header / .db-list-group-new */
  classPrefix?: string;
}) {
  // Ring on the toggled group until the collapse applies AND paints, so the
  // click feels instant whether the lag is the state update or the reflow.
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const handleToggle = (key: string) => {
    setPendingKey(key);
    onToggle(key);
  };

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
            className={`${classPrefix}-header`}
            style={{ gridColumn: "1 / -1", gridRow: h.row, border: "none" }}
            contentEditable={false}
            onClick={() => handleToggle(h.key)}
          >
            {pending ? (
              <SpinnerRing
                size={16}
                className={`${classPrefix}-header__ring`}
              />
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
            className={`${classPrefix}-new`}
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

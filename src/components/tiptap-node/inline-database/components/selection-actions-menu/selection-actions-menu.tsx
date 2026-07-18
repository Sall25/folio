import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  CornerUpRight,
  Link as LinkIcon,
  List,
  MessageSquare,
  Smile,
  Star,
  Trash2,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Card,
  CardBody,
  CardGroupLabel,
  CardHeader,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import { Input } from "src/components/tiptap-ui-primitive/input";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { DynamicIcon } from "src/components/tiptap-ui/cover/dynamic-icon";
import { PROPERTY_TYPE_ICONS } from "src/types/property-type-meta";
import type { DatabaseProperty } from "src/types";
import "./selection-actions-menu.scss";

type Panel =
  | { type: "main" }
  | { type: "properties" }
  | { type: "property"; propertyId: string };

type LucideIcon = React.ComponentType<{ className?: string; size?: number }>;

function MenuRow({
  Icon,
  label,
  shortcut,
  navigable,
  onClick,
  danger,
}: {
  Icon: LucideIcon;
  label: string;
  shortcut?: string;
  navigable?: boolean;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className={danger ? "db-actions-menu__row--danger" : undefined}
      style={{
        width: "100%",
        justifyContent: "flex-start",
        borderRadius: "var(--tt-radius-sm)",
      }}
    >
      <Icon className="tiptap-button-icon" size={16} />
      <span className="tiptap-button-text">{label}</span>
      <Spacer orientation="horizontal" />
      {shortcut && (
        <span className="db-actions-menu__shortcut">{shortcut}</span>
      )}
      {navigable && (
        <ChevronRight className="tiptap-button-icon-sub" size={14} />
      )}
    </Button>
  );
}

/** Types with an enumerable value set — the ones a bulk edit can set directly. */
function isBulkEditable(prop: DatabaseProperty) {
  const t = prop.config.type;
  return (
    t === "select" || t === "status" || t === "multi_select" || t === "checkbox"
  );
}

function optionsOf(prop: DatabaseProperty): { id: string; name: string }[] {
  return (
    (prop.config as { options?: { id: string; name: string }[] }).options ?? []
  );
}

/**
 * Actions menu for the current record selection.
 *
 * Panels are LOCAL state, not db.pushPanel: the shared stack already serves the
 * view-options menu and the property header, and a third consumer would
 * collide with them.
 *
 * The property list shows EVERY property (matching Notion) — non-bulk-editable
 * types open a panel explaining they need a per-record edit rather than being
 * hidden, so the list stays a faithful picture of the schema.
 */
export function SelectionActionsMenu({
  recordIds,
  properties,
  onSetValue,
  onDelete,
  onDuplicate,
  onCopyLink,
  onAddToFavorites,
  onEditIcon,
  onComment,
  onMoveTo,
  onOpenIn,
  lastEditedBy,
  lastEditedAt,
  onClose,
}: {
  recordIds: string[];
  properties: DatabaseProperty[];
  onSetValue: (propertyId: string, value: unknown) => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onCopyLink?: () => void;
  onAddToFavorites?: () => void;
  onEditIcon?: () => void;
  onComment?: () => void;
  onMoveTo?: () => void;
  onOpenIn?: () => void;
  lastEditedBy?: string;
  lastEditedAt?: string;
  onClose: () => void;
}) {
  const [panel, setPanel] = useState<Panel>({ type: "main" });
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();

  const activeProp =
    panel.type === "property"
      ? properties.find((p) => p.id === panel.propertyId)
      : undefined;

  const filteredProps = useMemo(
    () =>
      q
        ? properties.filter((p) => p.name.toLowerCase().includes(q))
        : properties,
    [properties, q],
  );

  const run = (fn?: () => void) => {
    fn?.();
    onClose();
  };

  const match = (label: string) => !q || label.toLowerCase().includes(q);

  // ── Property value panel ────────────────────────────────────────────────
  if (panel.type === "property" && activeProp) {
    return (
      <Card className="db-actions-menu">
        <CardHeader>
          <Button
            variant="ghost"
            onClick={() => setPanel({ type: "properties" })}
            style={{ background: "transparent" }}
          >
            <ChevronLeft size={16} className="tiptap-button-icon" />
          </Button>
          <CardGroupLabel>{activeProp.name}</CardGroupLabel>
        </CardHeader>
        <CardBody style={{ width: "100%" }}>
          <CardItemGroup>
            {!isBulkEditable(activeProp) ? (
              <span className="db-panel__empty">
                {activeProp.config.type} values are edited per record
              </span>
            ) : activeProp.config.type === "checkbox" ? (
              <>
                <Button
                  variant="ghost"
                  style={{ justifyContent: "flex-start", width: "100%" }}
                  onClick={() => run(() => onSetValue(activeProp.id, true))}
                >
                  <span className="tiptap-button-text">Checked</span>
                </Button>
                <Button
                  variant="ghost"
                  style={{ justifyContent: "flex-start", width: "100%" }}
                  onClick={() => run(() => onSetValue(activeProp.id, false))}
                >
                  <span className="tiptap-button-text">Unchecked</span>
                </Button>
              </>
            ) : (
              optionsOf(activeProp).map((o) => (
                <Button
                  key={o.id}
                  variant="ghost"
                  style={{ justifyContent: "flex-start", width: "100%" }}
                  onClick={() => run(() => onSetValue(activeProp.id, o.id))}
                >
                  <span className="tiptap-button-text">{o.name}</span>
                </Button>
              ))
            )}

            {isBulkEditable(activeProp) && (
              <>
                <Separator orientation="horizontal" />
                <Button
                  variant="ghost"
                  style={{ justifyContent: "flex-start", width: "100%" }}
                  onClick={() => run(() => onSetValue(activeProp.id, null))}
                >
                  <span className="tiptap-button-text">Clear value</span>
                </Button>
              </>
            )}
          </CardItemGroup>
        </CardBody>
      </Card>
    );
  }

  // ── Property list ───────────────────────────────────────────────────────
  if (panel.type === "properties") {
    return (
      <Card className="db-actions-menu">
        <CardHeader>
          <Button
            variant="ghost"
            onClick={() => setPanel({ type: "main" })}
            style={{ background: "transparent" }}
          >
            <ChevronLeft size={16} className="tiptap-button-icon" />
          </Button>
          <CardGroupLabel>Edit property</CardGroupLabel>
        </CardHeader>
        <CardBody style={{ width: "100%" }}>
          <CardItemGroup>
            {filteredProps.length === 0 ? (
              <span className="db-panel__empty">No properties found</span>
            ) : (
              filteredProps.map((prop) => (
                <Button
                  key={prop.id}
                  variant="ghost"
                  style={{
                    justifyContent: "flex-start",
                    width: "100%",
                    borderRadius: "var(--tt-radius-sm)",
                  }}
                  onClick={() =>
                    setPanel({ type: "property", propertyId: prop.id })
                  }
                >
                  <DynamicIcon
                    name={PROPERTY_TYPE_ICONS[prop.config.type]}
                    size={16}
                    filled={false}
                    className="tiptap-button-icon"
                  />
                  <span className="tiptap-button-text">{prop.name}</span>
                </Button>
              ))
            )}
          </CardItemGroup>
        </CardBody>
      </Card>
    );
  }

  // ── Main ────────────────────────────────────────────────────────────────
  const plural = recordIds.length > 1;

  return (
    <Card className="db-actions-menu">
      <div className="db-actions-menu__search">
        <Input
          autoFocus
          value={query}
          placeholder="Search actions..."
          onChange={(e) => setQuery(e.target.value)}
          style={{ height: 30, width: "100%" }}
        />
      </div>

      <CardBody style={{ width: "100%" }}>
        <CardItemGroup>
          <CardGroupLabel>{plural ? "Pages" : "Page"}</CardGroupLabel>
          {match("Add to Favorites") && (
            <MenuRow
              Icon={Star}
              label="Add to Favorites"
              onClick={() => run(onAddToFavorites)}
            />
          )}
          {match("Edit icon") && (
            <MenuRow
              Icon={Smile}
              label="Edit icon"
              onClick={() => run(onEditIcon)}
            />
          )}
          {match("Edit property") && (
            <MenuRow
              Icon={List}
              label="Edit property"
              navigable
              onClick={() => setPanel({ type: "properties" })}
            />
          )}
        </CardItemGroup>

        <Separator orientation="horizontal" />

        <CardItemGroup>
          {match("Open in") && (
            <MenuRow
              Icon={ArrowUpRight}
              label="Open in"
              navigable
              onClick={() => run(onOpenIn)}
            />
          )}
          {match("Comment") && (
            <MenuRow
              Icon={MessageSquare}
              label="Comment"
              shortcut="Ctrl+⇧+M"
              onClick={() => run(onComment)}
            />
          )}
        </CardItemGroup>

        <Separator orientation="horizontal" />

        <CardItemGroup>
          {match("Copy link") && (
            <MenuRow
              Icon={LinkIcon}
              label="Copy link"
              onClick={() => run(onCopyLink)}
            />
          )}
          {match("Duplicate") && (
            <MenuRow
              Icon={Copy}
              label="Duplicate"
              shortcut="Ctrl+D"
              onClick={() => run(onDuplicate)}
            />
          )}
          {match("Move to") && (
            <MenuRow
              Icon={CornerUpRight}
              label="Move to"
              shortcut="Ctrl+⇧+P"
              onClick={() => run(onMoveTo)}
            />
          )}
          {match("Move to Trash") && (
            <MenuRow
              Icon={Trash2}
              label="Move to Trash"
              shortcut="Del"
              danger
              onClick={() => run(onDelete)}
            />
          )}
        </CardItemGroup>
      </CardBody>

      {(lastEditedBy || lastEditedAt) && (
        <div className="db-actions-menu__footer">
          {lastEditedBy && <div>Last edited by {lastEditedBy}</div>}
          {lastEditedAt && <div>{lastEditedAt}</div>}
        </div>
      )}
    </Card>
  );
}

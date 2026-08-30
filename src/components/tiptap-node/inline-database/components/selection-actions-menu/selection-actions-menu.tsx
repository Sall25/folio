import { useMemo, useState } from "react";
import { ArrowUpRight, ChevronLeft, ListIcon } from "lucide-react";
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
import { DynamicIcon } from "src/components/tiptap-ui/cover/dynamic-icon";
import { PROPERTY_TYPE_ICONS } from "src/types/property-type-meta";
import type { DatabaseProperty, ID } from "src/types";
import "./selection-actions-menu.scss";
import {
  AddToFavoritesItem,
  CommentItem,
  CopyLinkItem,
  DuplicateRecordItem,
  EditIconItem,
  LayoutItem,
  MoveToItem,
  MoveToTrashItem,
  PropertyVisibilityItem,
} from "../record-action-items";
import { EditPropertyList } from "../edit-property-list";
import { NavigableMenuItem } from "../navigable-menu-item";
import { OpenInFlyout, type OpenInMode } from "../open-in-flyout";

type Panel =
  | { type: "main" }
  | { type: "properties" }
  | { type: "property"; propertyId: string };

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
  // onComment,
  // onMoveTo,
  onOpenIn,
  onLayout,
  onPropertyVisibility,
  lastEditedBy,
  lastEditedAt,
  onClose,
  isFavorite,
  onPickProperty,
  //  onOpenEditProperty
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
  onMoveTo?: (
    recordId: string,
    newParentId: string | null,
    category?: string | undefined,
  ) => void;
  onOpenIn?: (mode: OpenInMode) => void;
  onOpenEditProperty?: (propertyId: string) => void;
  /** Card layout options (cover fit, size) — board/gallery only. */
  onLayout?: () => void;
  /** Which properties show on the card — board/gallery only. */
  onPropertyVisibility?: () => void;
  lastEditedBy?: string;
  lastEditedAt?: string;
  onClose: () => void;
  isFavorite?: boolean;
  onPickProperty?: (id: ID) => void;
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
          <AddToFavoritesItem
            isFavorite={isFavorite}
            onToggle={() => onAddToFavorites?.()}
          />
          <EditIconItem onOpen={() => run(() => onEditIcon?.())} />
          <NavigableMenuItem Icon={ListIcon} label="Edit property">
            <EditPropertyList
              properties={properties}
              onPick={(propertyId) => run(() => onPickProperty?.(propertyId))}
            />
          </NavigableMenuItem>
        </CardItemGroup>

        <Separator orientation="horizontal" />

        <CardItemGroup>
          <LayoutItem onOpen={() => run(onLayout)} />
          <PropertyVisibilityItem onOpen={() => run(onPropertyVisibility)} />
        </CardItemGroup>
        <Separator orientation="horizontal" style={{ height: 0.5 }} />
        <CardItemGroup>
          <NavigableMenuItem Icon={ArrowUpRight} label="Open in">
            <OpenInFlyout onOpen={(mode) => run(() => onOpenIn?.(mode))} />
          </NavigableMenuItem>
          <CommentItem onComment={() => {}} />
        </CardItemGroup>

        <Separator orientation="horizontal" />

        <CardItemGroup>
          <CopyLinkItem onCopyLink={() => onCopyLink?.()} />
          <DuplicateRecordItem onDuplicate={() => onDuplicate?.()} />
          <MoveToItem onOpen={() => {}} />
          <MoveToTrashItem onDelete={() => onDelete?.()} />
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

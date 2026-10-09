import "./selection-actions-menu.scss";
import { ArrowUpRight, ChevronLeft, ListIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Input } from "src/components/tiptap-ui-primitive/input";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { DynamicIcon } from "src/features/pages/cover/dynamic-icon";
import type { DatabaseProperty, ID } from "src/types";
import { PROPERTY_TYPE_ICONS } from "src/types/property-type-meta";
import { EditPropertyList } from "../edit-property-list";
import { NavigableMenuItem } from "../navigable-menu-item";
import { OpenInFlyout, type OpenInMode } from "../open-in-flyout";

import {
  Card,
  CardBody,
  CardGroupLabel,
  CardHeader,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";

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
  // onOpenEditProperty
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
  const { t } = useTranslation();
  const [panel, setPanel] = useState<Panel>({ type: "main" });
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();

  const matchesAction = (label: string): boolean => {
    return label.toLowerCase().includes(q);
  };

  const activeProp =
    panel.type === "property"
      ? properties.find((p) => p.id === panel.propertyId)
      : undefined;

  const filteredProps = q
    ? properties.filter((p) => p.name.toLowerCase().includes(q))
    : properties;

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

  const favoriteLabel = isFavorite
    ? t("database.selectionActions.removeFromFavorites")
    : t("database.selectionActions.addToFavorites");

  // Determine whether each group contains any matching action.
  const showPageActions = [
    favoriteLabel,
    t("database.selectionActions.editIcon"),
    t("database.selectionActions.editProperty"),
  ].some(matchesAction);

  const showLayoutActions = [
    t("database.selectionActions.layout"),
    t("database.selectionActions.propertyVisibility"),
  ].some(matchesAction);

  const showOpenActions = [
    t("database.selectionActions.openIn"),
    t("blockMenu.comment"),
  ].some(matchesAction);

  const showRecordActions = [
    t("people.copyLink"),
    t("actions.duplicate"),
    t("moveTo.label"),
    t("ui.moveToTrash"),
  ].some(matchesAction);

  const hasMatches =
    showPageActions ||
    showLayoutActions ||
    showOpenActions ||
    showRecordActions;

  return (
    <Card className="db-actions-menu">
      <div className="db-actions-menu__search">
        <Input
          autoFocus
          value={query}
          placeholder="Search actions..."
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "ArrowDown" && e.key !== "Enter") return;

            if (e.key === "Enter" && !q) return;

            const firstItem = e.currentTarget
              .closest(".db-actions-menu")
              ?.querySelector<HTMLButtonElement>(
                '[role="menuitem"]:not([disabled])',
              );

            if (!firstItem) return;

            e.preventDefault();

            if (e.key === "ArrowDown") {
              firstItem.focus();
            } else {
              firstItem.click();
            }
          }}
          style={{ height: 30, width: "100%" }}
        />
      </div>

      <CardBody style={{ width: "100%" }}>
        {/* ── Page actions ───────────────────────────────────── */}

        {showPageActions && (
          <CardItemGroup>
            <CardGroupLabel>{plural ? "Pages" : "Page"}</CardGroupLabel>

            {matchesAction(favoriteLabel) && (
              <AddToFavoritesItem
                label={favoriteLabel}
                isFavorite={isFavorite}
                onToggle={() => onAddToFavorites?.()}
              />
            )}

            {matchesAction(t("database.selectionActions.editIcon")) && (
              <EditIconItem
                label={t("database.selectionActions.editIcon")}
                onOpen={() => run(() => onEditIcon?.())}
              />
            )}

            {matchesAction(t("database.selectionActions.editProperty")) && (
              <NavigableMenuItem
                Icon={ListIcon}
                label={t("database.selectionActions.editProperty")}
              >
                <EditPropertyList
                  properties={properties}
                  onPick={(propertyId) =>
                    run(() => onPickProperty?.(propertyId))
                  }
                />
              </NavigableMenuItem>
            )}
          </CardItemGroup>
        )}

        {/* ── Layout actions ─────────────────────────────────── */}

        {showPageActions && showLayoutActions && (
          <Separator orientation="horizontal" />
        )}

        {showLayoutActions && (
          <CardItemGroup>
            {matchesAction(t("database.selectionActions.layout")) && (
              <LayoutItem
                label={t("database.selectionActions.layout")}
                onOpen={() => run(onLayout)}
              />
            )}

            {matchesAction(
              t("database.selectionActions.propertyVisibility"),
            ) && (
              <PropertyVisibilityItem
                label={t("database.selectionActions.propertyVisibility")}
                onOpen={() => run(onPropertyVisibility)}
              />
            )}
          </CardItemGroup>
        )}

        {/* ── Open / comment actions ────────────────────────── */}

        {(showPageActions || showLayoutActions) && showOpenActions && (
          <Separator orientation="horizontal" style={{ height: 0.5 }} />
        )}

        {showOpenActions && (
          <CardItemGroup>
            {matchesAction(t("database.selectionActions.openIn")) && (
              <NavigableMenuItem
                Icon={ArrowUpRight}
                label={t("database.selectionActions.openIn")}
              >
                <OpenInFlyout onOpen={(mode) => run(() => onOpenIn?.(mode))} />
              </NavigableMenuItem>
            )}

            {matchesAction(t("blockMenu.comment")) && (
              <CommentItem
                label={t("blockMenu.comment")}
                onComment={() => {}}
              />
            )}
          </CardItemGroup>
        )}

        {/* ── Record actions ────────────────────────────────── */}

        {(showPageActions || showLayoutActions || showOpenActions) &&
          showRecordActions && <Separator orientation="horizontal" />}

        {showRecordActions && (
          <CardItemGroup>
            {matchesAction(t("people.copyLink")) && (
              <CopyLinkItem
                label={t("people.copyLink")}
                onCopyLink={() => onCopyLink?.()}
              />
            )}

            {matchesAction(t("actions.duplicate")) && (
              <DuplicateRecordItem
                label={t("actions.duplicate")}
                onDuplicate={() => onDuplicate?.()}
              />
            )}

            {matchesAction(t("moveTo.label")) && (
              <MoveToItem label={t("moveTo.label")} onOpen={() => {}} />
            )}

            {matchesAction(t("ui.moveToTrash")) && (
              <MoveToTrashItem
                label={t("ui.moveToTrash")}
                onDelete={() => onDelete?.()}
              />
            )}
          </CardItemGroup>
        )}

        {!hasMatches && (
          <CardItemGroup>
            <span className="db-panel__empty">
              {t("database.selectionActions.noResults")}
            </span>
          </CardItemGroup>
        )}
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

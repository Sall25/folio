import { Check, Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Card,
  CardBody,
  CardFooter,
} from "src/components/tiptap-ui-primitive/card";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import type {
  DatabaseView,
  BoardView,
  TableView,
  ListView,
  ID,
  DatabaseProperty,
} from "src/types";
import { isGroupableProperty } from "src/types";
import type { UseDatabaseReturn } from "../../hooks/use-database";
import { PROPERTY_TYPE_ICONS } from "src/types/property-type-meta";
import "./group-panel.scss";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { DynamicIcon } from "src/features/pages/cover/dynamic-icon";
import { useMemo } from "react";
import { getColumnDefs } from "../../nodes/database-board-node-view/utils";

export function GroupPanel({
  properties,
  db,
  activeView,
  bare,
}: {
  properties: DatabaseProperty[];
  db: UseDatabaseReturn;
  activeView: DatabaseView | undefined;
  bare?: boolean;
}) {
  const { t } = useTranslation();
  const groupableProperties = properties.filter((p) =>
    isGroupableProperty(p.config.type),
  );

  const groupByPropertyId =
    activeView?.type === "board"
      ? (activeView as BoardView).groupByPropertyId
      : activeView?.type === "table"
        ? ((activeView as TableView).groupByPropertyId ?? null)
        : activeView?.type === "list"
          ? ((activeView as ListView).groupByPropertyId ?? null)
          : null;

  const showEmptyGroups =
    activeView?.type === "board"
      ? (activeView as BoardView).showEmptyGroups
      : ((activeView as TableView).showEmptyGroups ?? false);
  // Derive the groups for the current group-by property (same as the board does).
  const groupByProp = properties.find((p) => p.id === groupByPropertyId);
  const groupDefs = useMemo(
    () => (groupByProp ? getColumnDefs(groupByProp) : []),
    [groupByProp],
  );
  const hiddenGroups =
    activeView?.type === "board"
      ? ((activeView as BoardView).hiddenGroups ?? [])
      : [];

  if (!activeView) return null;

  function toggleGroupVisibility(groupId: string) {
    if (activeView!.type !== "board") return;
    const current = (activeView as BoardView).hiddenGroups ?? [];
    const next = current.includes(groupId)
      ? current.filter((id) => id !== groupId)
      : [...current, groupId];
    db.updateView(activeView!.id, { hiddenGroups: next } as Partial<BoardView>);
  }

  function setGroup(propertyId: ID | null) {
    if (activeView!.type === "board") {
      db.updateView(activeView!.id, {
        groupByPropertyId: propertyId ?? "",
      } as Partial<BoardView>);
    } else {
      db.updateView(activeView!.id, {
        groupByPropertyId: propertyId,
        collapsedGroups: [],
      } as Partial<TableView>);
    }
  }

  function toggleShowEmpty() {
    db.updateView(activeView!.id, {
      showEmptyGroups: !showEmptyGroups,
    } as Partial<TableView>);
  }

  const body = (
    <>
      <CardBody>
        {groupableProperties.length === 0 ? (
          <span className="db-panel__empty">
            {t("database.group.placeholder")}
          </span>
        ) : (
          <>
            {/* No grouping option */}
            <Button
              variant="ghost"
              style={{ justifyContent: "flex-start", width: "100%" }}
              data-active-state={!groupByPropertyId ? "on" : "off"}
              onClick={() => setGroup(null)}
            >
              <span className="tiptap-button-text">
                {t("database.group.noGrouping")}
              </span>
              <Spacer orientation="horizontal" />
              {!groupByPropertyId && (
                <Check size={13} className="tiptap-button-icon-sub" />
              )}
            </Button>

            <Separator orientation="horizontal" style={{ margin: "4px 0" }} />

            {/* Groupable properties */}
            {groupableProperties.map((p) => {
              // Material Symbols name string now, not an icon component.
              const iconName = PROPERTY_TYPE_ICONS[p.config.type];
              const isActive = groupByPropertyId === p.id;
              return (
                <Button
                  key={p.id}
                  variant="ghost"
                  style={{ justifyContent: "flex-start", width: "100%" }}
                  data-active-state={isActive ? "on" : "off"}
                  onClick={() => setGroup(p.id)}
                >
                  {isActive ? (
                    <Check size={18} className="tiptap-button-icon" />
                  ) : (
                    <DynamicIcon
                      name={iconName}
                      size={20}
                      filled={false}
                      className="tiptap-button-icon"
                    />
                  )}
                  <span className="tiptap-button-text">{p.name}</span>
                </Button>
              );
            })}
          </>
        )}
        {groupByPropertyId && groupDefs.length > 0 && (
          <>
            <Separator orientation="horizontal" style={{ margin: "6px 0" }} />
            <div className="group-panel__section-label">
              {t("database.group.sectionLabel")}
            </div>
            <div className="group-panel__group-list">
              {groupDefs.map((g) => {
                const hidden = hiddenGroups.includes(g.id);
                return (
                  <div key={g.id} className="group-panel__group-row">
                    <span
                      className="group-panel__group-swatch"
                      style={
                        g.color
                          ? { background: `var(--tt-color-text-${g.color})` }
                          : undefined
                      }
                    />
                    <span className="group-panel__group-label">{g.label}</span>
                    <Button
                      variant="ghost"
                      className="group-panel__group-toggle"
                      tooltip={
                        hidden
                          ? t("database.group.showGroup")
                          : t("database.group.hideGroup")
                      }
                      onClick={() => toggleGroupVisibility(g.id)}
                    >
                      {hidden ? (
                        <EyeOff className="tiptap-button-icon" size={14} />
                      ) : (
                        <Eye className="tiptap-button-icon" size={14} />
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardBody>

      {groupByPropertyId && (
        <CardFooter>
          <Button
            variant="ghost"
            style={{
              justifyContent: "flex-start",
              width: "100%",
              fontSize: 12,
            }}
            onClick={toggleShowEmpty}
          >
            <span className="tiptap-button-text">
              {showEmptyGroups
                ? t("database.group.hideEmptyGroups")
                : t("database.group.showEmptyGroups")}
            </span>
          </Button>
        </CardFooter>
      )}
    </>
  );

  if (bare) return body;

  return <Card className="db-group-panel">{body}</Card>;
}

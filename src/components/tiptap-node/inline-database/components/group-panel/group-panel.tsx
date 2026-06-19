import { Check } from "lucide-react";
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

export function GroupPanel({
  properties,
  db,
  activeView,
}: {
  properties: DatabaseProperty[];
  db: UseDatabaseReturn;
  activeView: DatabaseView | undefined;
}) {
  if (!activeView) return null;

  const groupableProperties = properties.filter((p) =>
    isGroupableProperty(p.config.type),
  );

  const groupByPropertyId =
    activeView.type === "board"
      ? (activeView as BoardView).groupByPropertyId
      : activeView.type === "table"
        ? ((activeView as TableView).groupByPropertyId ?? null)
        : activeView.type === "list"
          ? ((activeView as ListView).groupByPropertyId ?? null)
          : null;

  const showEmptyGroups =
    activeView.type === "board"
      ? (activeView as BoardView).showEmptyGroups
      : ((activeView as TableView).showEmptyGroups ?? false);

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

  return (
    <Card className="db-group-panel">
      <CardBody>
        {groupableProperties.length === 0 ? (
          <span className="db-panel__empty">
            Add a select, status, or checkbox property to enable grouping
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
              <span className="tiptap-button-text">No grouping</span>
              <Spacer orientation="horizontal" />
              {!groupByPropertyId && (
                <Check size={13} className="tiptap-button-icon-sub" />
              )}
            </Button>

            <Separator orientation="horizontal" style={{ margin: "4px 0" }} />

            {/* Groupable properties */}
            {groupableProperties.map((p) => {
              const Icon = PROPERTY_TYPE_ICONS[p.config.type];
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
                    <Check size={13} className="tiptap-button-icon" />
                  ) : (
                    <Icon size={13} className="tiptap-button-icon" />
                  )}
                  <span className="tiptap-button-text">{p.name}</span>
                </Button>
              );
            })}
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
              {showEmptyGroups ? "Hide empty groups" : "Show empty groups"}
            </span>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

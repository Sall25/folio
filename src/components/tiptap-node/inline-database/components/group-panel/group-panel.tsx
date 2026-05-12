/* eslint-disable @typescript-eslint/no-explicit-any */
import { Check } from "lucide-react";
import type {
  DatabaseProperty,
  DatabaseView,
  BoardView,
} from "../../types/types";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Card,
  CardBody,
  CardGroupLabel,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";

import { getTypeMeta } from "../../types/config";
import { isGroupableProperty } from "../../types/types";
import * as LucideIcons from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// GroupPanel
// ─────────────────────────────────────────────────────────────────────────────

interface GroupPanelProps {
  view: DatabaseView;
  properties: DatabaseProperty[];
  onUpdateView: (patch: Partial<Omit<DatabaseView, "id" | "type">>) => void;
}

export function GroupPanel({
  view,
  properties,
  onUpdateView,
}: GroupPanelProps) {
  const groupableProps = properties.filter((p) =>
    isGroupableProperty(p.config.type),
  );

  const currentGroupId =
    view.type === "board" ? (view as BoardView).groupByPropertyId : null;

  // For non-board views, grouping switches the view type to board
  // For board views, it changes the groupBy property
  const handleSelect = (propertyId: string) => {
    if (view.type === "board") {
      onUpdateView({ groupByPropertyId: propertyId } as any);
    } else {
      // Signal to parent to switch view type to board with this groupBy
      onUpdateView({ groupByPropertyId: propertyId } as any);
    }
  };

  const handleClear = () => {
    if (view.type === "board") {
      onUpdateView({ groupByPropertyId: "" } as any);
    }
  };

  return (
    <Card>
      <CardBody style={{ minWidth: 260 }}>
        <CardItemGroup>
          <CardGroupLabel>Group by</CardGroupLabel>

          {groupableProps.length === 0 ? (
            <p
              style={{
                fontSize: 13,
                color: "var(--tt-gray-light-a-400)",
                padding: "4px 0",
              }}
            >
              No groupable properties. Add a Select, Status, or Checkbox
              property first.
            </p>
          ) : (
            groupableProps.map((prop) => {
              const meta = getTypeMeta(prop.config.type);
              const Icon = (LucideIcons as any)[meta.icon];
              const isSelected = currentGroupId === prop.id;

              return (
                <Button
                  key={prop.id}
                  variant="ghost"
                  style={{
                    width: "100%",
                    height: 30,
                    justifyContent: "flex-start",
                    gap: 8,
                  }}
                  onClick={() => handleSelect(prop.id)}
                >
                  <span
                    style={{
                      width: 16,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {isSelected && (
                      <Check
                        style={{ width: 13, height: 13 }}
                        className="tiptap-button-icon"
                      />
                    )}
                  </span>
                  {Icon && (
                    <Icon
                      style={{ width: 13, height: 13 }}
                      className="tiptap-button-icon"
                    />
                  )}
                  <span style={{ fontSize: 13, flex: 1, textAlign: "left" }}>
                    {prop.name}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--tt-gray-light-a-400)",
                    }}
                  >
                    {meta.label}
                  </span>
                </Button>
              );
            })
          )}

          {currentGroupId && (
            <>
              <div
                style={{
                  height: "0.5px",
                  background: "var(--tt-border-color)",
                  margin: "4px 0",
                }}
              />

              {/* Show empty groups toggle — only relevant for board view */}
              {view.type === "board" && (
                <Button
                  variant="ghost"
                  style={{
                    width: "100%",
                    height: 30,
                    justifyContent: "flex-start",
                    gap: 8,
                  }}
                  onClick={() =>
                    onUpdateView({
                      showEmptyGroups: !(view as BoardView).showEmptyGroups,
                    } as any)
                  }
                >
                  <span
                    style={{
                      width: 16,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {(view as BoardView).showEmptyGroups && (
                      <Check
                        style={{ width: 13, height: 13 }}
                        className="tiptap-button-icon"
                      />
                    )}
                  </span>
                  <span style={{ fontSize: 13 }}>Show empty groups</span>
                </Button>
              )}

              <Button
                variant="ghost"
                style={{
                  width: "100%",
                  height: 30,
                  justifyContent: "flex-start",
                  gap: 8,
                  color: "var(--tt-color-text-red)",
                }}
                onClick={handleClear}
              >
                <span style={{ width: 16 }} />
                <span style={{ fontSize: 13 }}>Remove grouping</span>
              </Button>
            </>
          )}
        </CardItemGroup>
      </CardBody>
    </Card>
  );
}

import { Eye, EyeOff } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Card,
  CardBody,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import type { DatabaseProperty, DatabaseView, ID } from "src/types";
import type { UseDatabaseReturn } from "../../hooks/use-database";
import { PROPERTY_TYPE_ICONS } from "src/types/property-type-meta";
import {
  Grid,
  GridRow,
  GridCell,
} from "src/components/tiptap-ui-primitive/grid";
import "./properties-panel.scss";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { DynamicIcon } from "src/components/tiptap-ui/cover/dynamic-icon";

export function PropertiesPanel({
  properties,
  db,
  activeView,
  bare = false,
}: {
  properties: DatabaseProperty[];
  db: UseDatabaseReturn;
  activeView: DatabaseView | undefined;
  bare?: boolean;
}) {
  if (!activeView) return null;

  const hidden = new Set(activeView.hiddenProperties ?? []);

  function toggleProperty(propertyId: ID) {
    const hiddenProperties = hidden.has(propertyId)
      ? [...hidden].filter((id) => id !== propertyId)
      : [...hidden, propertyId];
    db.updateView(activeView!.id, { hiddenProperties });
  }

  function showAll() {
    db.updateView(activeView!.id, { hiddenProperties: [] });
  }

  function hideAll() {
    const titleProp = properties.find((p) => p.config.type === "title");
    const hiddenProperties = properties
      .filter((p) => p.id !== titleProp?.id)
      .map((p) => p.id);
    db.updateView(activeView!.id, { hiddenProperties });
  }

  const visibleProperties = properties.filter((p) => !hidden.has(p.id));
  const hiddenProperties = properties.filter((p) => hidden.has(p.id));

  const renderRow = (p: (typeof properties)[0]) => {
    const iconName = PROPERTY_TYPE_ICONS[p.config.type];
    const isTitle = p.config.type === "title";
    const isVisible = !hidden.has(p.id);

    return (
      <GridRow key={p.id} style={{ padding: "3px 10px", width: "100%" }}>
        <GridCell>
          <Button variant="ghost" style={{ background: "transparent" }}>
            <DynamicIcon
              name={iconName}
              size={20}
              filled={false}
              className="tiptap-button-icon"
            />
            <span className="tiptap-button-text">{p.name}</span>
          </Button>
        </GridCell>
        <GridCell className="db-property-row__eye-cell">
          <Button
            variant="ghost"
            style={{ justifyContent: "flex-end" }}
            onClick={() => !isTitle && toggleProperty(p.id)}
            disabled={isTitle}
            aria-label={isVisible ? "Hide property" : "Show property"}
          >
            {isVisible ? (
              <Eye className="tiptap-button-icon" size={13} />
            ) : (
              <EyeOff className="tiptap-button-icon" size={13} />
            )}
          </Button>
        </GridCell>
      </GridRow>
    );
  };

  const body = (
    <CardBody style={{ width: "100%" }}>
      <Grid columns="1fr 30px" style={{ width: "100%" }}>
        {visibleProperties.length > 0 && (
          <>
            <CardItemGroup
              orientation="horizontal"
              style={{ width: "100%", justifyContent: "flex-start" }}
            >
              <span className="db-properties-panel__group-label">Visible</span>
              <Spacer orientation="horizontal" />
              <Button
                variant="ghost"
                onClick={showAll}
                style={{
                  width: "fit-content",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--tt-brand-color-400)",
                }}
              >
                <span className="tiptap-button-text">Show all</span>
              </Button>
            </CardItemGroup>
            {visibleProperties.map(renderRow)}
          </>
        )}
        {hiddenProperties.length > 0 && (
          <>
            <CardItemGroup
              orientation="horizontal"
              style={{ width: "100%", justifyContent: "flex-start" }}
            >
              <span className="db-properties-panel__group-label">Hidden</span>
              <Spacer orientation="horizontal" />
              <Button
                variant="ghost"
                onClick={hideAll}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--tt-brand-color-400)",
                }}
              >
                <span className="tiptap-button-text">Hide all</span>
              </Button>
            </CardItemGroup>
            {hiddenProperties.map(renderRow)}
          </>
        )}
      </Grid>
    </CardBody>
  );

  if (bare) return body;

  return <Card className="db-properties-panel">{body}</Card>;
}

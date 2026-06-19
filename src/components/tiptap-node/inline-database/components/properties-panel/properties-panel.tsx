import { GripVertical, Eye, EyeOff } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Card,
  CardBody,
  //CardFooter,
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

export function PropertiesPanel({
  properties,
  db,
  activeView,
}: {
  properties: DatabaseProperty[];
  db: UseDatabaseReturn;
  activeView: DatabaseView | undefined;
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
    const Icon = PROPERTY_TYPE_ICONS[p.config.type];
    const isTitle = p.config.type === "title";
    const isVisible = !hidden.has(p.id);

    return (
      <GridRow key={p.id} style={{ padding: "3px 10px" }}>
        <GridCell>
          <Button variant="ghost" style={{ background: "transparent" }}>
            <GripVertical size={13} className="tiptap-button-icon" />
          </Button>
        </GridCell>
        <GridCell>
          <Button variant="ghost" style={{ background: "transparent" }}>
            <Icon size={13} className="tiptap-button-icon" />
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

  return (
    <Card className="db-properties-panel">
      <CardBody style={{ width: "100%" }}>
        <Grid columns="20px 3fr 1fr">
          {visibleProperties.length > 0 && (
            <>
              <CardItemGroup orientation="horizontal">
                <span className="db-properties-panel__group-label">
                  Visible
                </span>
                <Spacer orientation="horizontal" />
                <Button
                  variant="ghost"
                  onClick={showAll}
                  style={{
                    justifyContent: "flex-start",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--tt-brand-color-400)",
                  }}
                >
                  Show all
                </Button>
              </CardItemGroup>
              {visibleProperties.map(renderRow)}
            </>
          )}
          {hiddenProperties.length > 0 && (
            <>
              <CardItemGroup orientation="horizontal">
                <span className="db-properties-panel__group-label">Hidden</span>
                <Spacer orientation="horizontal" />
                <Button
                  variant="ghost"
                  onClick={hideAll}
                  style={{
                    justifyContent: "flex-start",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--tt-brand-color-400)",
                  }}
                >
                  Hide all
                </Button>
              </CardItemGroup>
              {hiddenProperties.map(renderRow)}
            </>
          )}
        </Grid>
      </CardBody>

      {/* <CardFooter style={{ gap: 4 }}>
        <Button
          variant="ghost"
          onClick={hideAll}
          style={{ justifyContent: "flex-start", fontSize: 12 }}
        >
          Hide all
        </Button>
      </CardFooter> */}
    </Card>
  );
}

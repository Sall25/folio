import { useTranslation } from "react-i18next";
import type { DatabaseProperty, ID } from "src/types";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "src/components/tiptap-ui-primitive/dropdown-menu";
import { Check, ChevronDown } from "src/components/icons";
import type { GraphNode } from "../../utils/graph-model";

// What is on the canvas, in words.
//
// A graph is the one view whose rules are invisible: a line could be a
// relation or a link written in a page, a page could be missing because
// nothing joins it or because its relation is switched off, and a colour
// comes from a property nobody can see from here. This says all of it, and
// lets each of those be changed where it is said.

export interface GraphRelationChoice {
  property: DatabaseProperty;
  drawn: boolean;
  count: number;
}

export function GraphConnectionsPanel({
  relations,
  pageLinks,
  colorProperties,
  colorPropertyId,
  colorOf,
  hideUnlinked,
  unlinked,
  mostConnected,
  pages,
  connections,
  onToggleRelation,
  onTogglePageLinks,
  onToggleUnlinked,
  onColorBy,
  onGoTo,
}: {
  relations: GraphRelationChoice[];
  /** Links written in pages: whether they are drawn, and how many there are. */
  pageLinks: { drawn: boolean; count: number };
  /** The select and status properties a node could take its colour from. */
  colorProperties: DatabaseProperty[];
  colorPropertyId: ID | null;
  colorOf: (node: GraphNode) => string | undefined;
  hideUnlinked: boolean;
  unlinked: number;
  mostConnected: GraphNode[];
  pages: number;
  connections: number;
  onToggleRelation: (id: ID, drawn: boolean) => void;
  onTogglePageLinks: (drawn: boolean) => void;
  onToggleUnlinked: (shown: boolean) => void;
  onColorBy: (id: ID | null) => void;
  onGoTo: (id: ID) => void;
}) {
  const { t } = useTranslation();
  const colorProperty = colorProperties.find((p) => p.id === colorPropertyId);

  return (
    <Card className="db-graph-panel">
      <CardItemGroup>
        <h3 className="db-graph-panel__head">{t("database.graph.drawn")}</h3>
        {relations.map(({ property, drawn, count }) => (
          <Tick
            key={property.id}
            on={drawn}
            label={property.name}
            count={count}
            onClick={() => onToggleRelation(property.id, !drawn)}
          />
        ))}
        <Tick
          on={pageLinks.drawn}
          label={t("database.graph.pageLinks")}
          count={pageLinks.count}
          onClick={() => onTogglePageLinks(!pageLinks.drawn)}
        />
        <Tick
          on={!hideUnlinked}
          label={t("database.graph.unlinked")}
          count={unlinked}
          onClick={() => onToggleUnlinked(hideUnlinked)}
        />
      </CardItemGroup>

      {colorProperties.length > 0 && (
        <CardItemGroup>
          <h3 className="db-graph-panel__head">
            {t("database.graph.colourBy")}
          </h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="db-graph-panel__select">
                <span className="tiptap-button-text">
                  {colorProperty?.name ?? t("database.graph.noColour")}
                </span>
                <ChevronDown className="tiptap-button-icon-sub" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <Card style={{ padding: 8 }}>
                <CardItemGroup style={{ width: "100%" }}>
                  <DropdownMenuItem asChild>
                    <Button
                      variant="ghost"
                      data-active-state={colorPropertyId ? "off" : "on"}
                      style={{ justifyContent: "flex-start", width: "100%" }}
                      onClick={() => onColorBy(null)}
                    >
                      <span className="tiptap-button-text">
                        {t("database.graph.noColour")}
                      </span>
                    </Button>
                  </DropdownMenuItem>
                  {colorProperties.map((p) => (
                    <DropdownMenuItem key={p.id} asChild>
                      <Button
                        variant="ghost"
                        data-active-state={
                          colorPropertyId === p.id ? "on" : "off"
                        }
                        style={{ justifyContent: "flex-start", width: "100%" }}
                        onClick={() => onColorBy(p.id)}
                      >
                        <span className="tiptap-button-text">{p.name}</span>
                      </Button>
                    </DropdownMenuItem>
                  ))}
                </CardItemGroup>
              </Card>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardItemGroup>
      )}

      <CardItemGroup>
        <h3 className="db-graph-panel__head">{t("database.graph.key")}</h3>
        <p className="db-graph-panel__key">
          <svg width="26" height="8" aria-hidden="true">
            <line
              className="db-graph-panel__line"
              x1="0"
              y1="4"
              x2="26"
              y2="4"
            />
          </svg>
          {t("database.graph.keyRelation")}
        </p>
        <p className="db-graph-panel__key">
          <svg width="26" height="8" aria-hidden="true">
            <line
              className="db-graph-panel__line"
              strokeDasharray="5 4"
              x1="0"
              y1="4"
              x2="26"
              y2="4"
            />
          </svg>
          {t("database.graph.keyPageLink")}
        </p>
        <p className="db-graph-panel__key">
          <svg width="26" height="14" aria-hidden="true">
            <circle className="db-graph-panel__blob" cx="13" cy="7" r="4.5" />
            <circle className="db-graph-panel__halo" cx="13" cy="7" r="6.5" />
          </svg>
          {t("database.graph.keyRing")}
        </p>
        <p className="db-graph-panel__key">
          <svg width="26" height="14" aria-hidden="true">
            <circle className="db-graph-panel__blob" cx="7" cy="7" r="3" />
            <circle className="db-graph-panel__blob" cx="18" cy="7" r="6" />
          </svg>
          {t("database.graph.keySize")}
        </p>
      </CardItemGroup>

      {mostConnected.length > 0 && (
        <CardItemGroup>
          <h3 className="db-graph-panel__head">
            {t("database.graph.mostConnected")}
          </h3>
          {mostConnected.map((node) => (
            <Button
              key={node.id}
              variant="ghost"
              className="db-graph-panel__page"
              onClick={() => onGoTo(node.id)}
            >
              <span
                className="db-graph-panel__pin"
                style={
                  colorOf(node) ? { background: colorOf(node) } : undefined
                }
              />
              <span className="tiptap-button-text">{node.title || "—"}</span>
              <span className="db-graph-panel__count">{node.degree}</span>
            </Button>
          ))}
        </CardItemGroup>
      )}

      <p className="db-graph-panel__foot">
        {t("database.graph.counts", { pages, connections, unlinked })}
      </p>
    </Card>
  );
}

/** One line of the panel that can be switched off. */
function Tick({
  on,
  label,
  count,
  onClick,
}: {
  on: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      role="checkbox"
      aria-checked={on}
      className="db-graph-panel__tick"
      onClick={onClick}
    >
      <span className="db-graph-panel__box" data-on={on || undefined}>
        {on && <Check size={11} />}
      </span>
      <span className="tiptap-button-text">{label}</span>
      <span className="db-graph-panel__count">{count}</span>
    </Button>
  );
}

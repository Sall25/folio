import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { DatabaseView, GraphBackground, GraphView, ID } from "src/types";
import {
  CardGroupLabel,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import {
  Circle,
  Frame,
  LayoutGrid,
  Maximize2,
  Minus,
  Palette,
  Plus,
  Share2,
  Sparkles,
} from "src/components/icons";
import { relationRecordIds } from "src/lib/relation-ids";
import { pageLinkIds } from "../../utils/page-links";
import type { UseDatabaseReturn } from "../../hooks";
import { useDatabaseContext } from "../../context/database-context";
import {
  linkCounts,
  linkProperties,
  relationProperties,
} from "../../utils/graph-model";
import { requestGraph } from "../../utils/graph-cameras";
import { MenuRow } from "../menu-row";
import "./graph-panel.scss";

// Layouts › Graph: what the canvas draws, what the colours mean, what it is
// drawn on, and how to get back to all of it.
//
// It sits under the layout grid, where a graph is chosen, with the table's
// and the gallery's own settings — not in a menu above the canvas and not
// in a panel of its own. A graph is a view, not an app inside one.

const BACKGROUNDS: { kind: GraphBackground; Icon: typeof Circle }[] = [
  { kind: "dots", Icon: Circle },
  { kind: "grid", Icon: LayoutGrid },
  { kind: "glow", Icon: Sparkles },
];

export function GraphPanel({
  view,
  db,
}: {
  view: DatabaseView;
  db: UseDatabaseReturn;
}) {
  const { t } = useTranslation();
  const { source, sortedRecords } = useDatabaseContext();
  const graph = view.type === "graph" ? (view as GraphView) : undefined;
  // Its own memo, so the two below do not see a new array every render.
  const properties = useMemo(
    () => source?.properties ?? [],
    [source?.properties],
  );

  const set = (patch: Partial<GraphView>) =>
    db.updateView(view.id, patch as Partial<DatabaseView>);

  const { choices, pageLinks } = useMemo(() => {
    const all = relationProperties(properties);
    const drawn = new Set(linkProperties(properties, graph).map((p) => p.id));
    const counts = linkCounts(sortedRecords, properties);
    return {
      choices: all.map((property) => ({
        property,
        drawn: drawn.has(property.id),
        count: counts.byProperty.get(property.id) ?? 0,
      })),
      pageLinks: counts.pageLinks,
    };
  }, [properties, graph, sortedRecords]);

  /** Switch one relation on or off. An empty list means all of them, so
   *  the first switch-off has to write the rest out in full — otherwise
   *  "all but this one" would read as "all". */
  const toggleRelation = (id: ID, drawn: boolean) => {
    const all = choices.map((c) => c.property.id);
    const now = new Set(
      graph?.linkPropertyIds?.length ? graph.linkPropertyIds : all,
    );
    if (drawn) now.add(id);
    else now.delete(id);
    const next = all.filter((p) => now.has(p));
    set({ linkPropertyIds: next.length === all.length ? [] : next });
  };

  const colorProperties = properties.filter(
    (p) =>
      p.config.type === "select" ||
      p.config.type === "status" ||
      p.config.type === "multi_select",
  );

  // Counted from the records rather than from the drawing: when they are
  // being left out there is nothing in the drawing left to count, and the
  // number is the reason the switch is worth offering. Both ends count —
  // a page is joined to something if anything is joined to it.
  const unlinked = useMemo(() => {
    const joined = new Set<ID>();
    for (const record of sortedRecords) {
      const touches = [
        ...relationProperties(properties).flatMap((p) =>
          relationRecordIds(record.values?.[p.id]),
        ),
        ...pageLinkIds(record.content),
      ].filter((to) => to !== record.id);
      if (touches.length) joined.add(record.id);
      for (const to of touches) joined.add(to);
    }
    return sortedRecords.filter((r) => !joined.has(r.id)).length;
  }, [sortedRecords, properties]);

  const count = (n: number) => t("database.graph.linkCount", { count: n });

  return (
    <div className="db-graph-panel">
      <CardItemGroup>
        <CardGroupLabel>{t("database.graph.canvasLabel")}</CardGroupLabel>
        {/* The canvas is elsewhere on the page; it answers to its view
            (graph-cameras.ts). */}
        <MenuRow
          Icon={Frame}
          label={t("database.graph.fit")}
          sub={t("database.graph.fitSub")}
          onClick={() => requestGraph(view.id, "fit")}
        />
        <MenuRow
          Icon={Plus}
          label={t("database.graph.zoomIn")}
          onClick={() => requestGraph(view.id, "zoomIn")}
        />
        <MenuRow
          Icon={Minus}
          label={t("database.graph.zoomOut")}
          onClick={() => requestGraph(view.id, "zoomOut")}
        />
        <MenuRow
          Icon={Maximize2}
          label={t("database.stage.open")}
          onClick={() => requestGraph(view.id, "open")}
        />
      </CardItemGroup>

      <CardItemGroup>
        <CardGroupLabel>{t("database.graph.drawn")}</CardGroupLabel>
        {choices.map(({ property, drawn, count: n }) => (
          <MenuRow
            key={property.id}
            Icon={Share2}
            label={property.name}
            sub={count(n)}
            toggle
            checked={drawn}
            onToggle={() => toggleRelation(property.id, !drawn)}
          />
        ))}
        <MenuRow
          label={t("database.graph.pageLinks")}
          sub={count(pageLinks)}
          toggle
          checked={graph?.showPageLinks !== false}
          onToggle={() =>
            set({ showPageLinks: graph?.showPageLinks === false })
          }
        />
        <MenuRow
          label={t("database.graph.unlinked")}
          sub={count(unlinked)}
          toggle
          checked={!graph?.hideUnlinked}
          onToggle={() => set({ hideUnlinked: !graph?.hideUnlinked })}
        />
      </CardItemGroup>

      <CardItemGroup>
        <CardGroupLabel>{t("database.graph.colourBy")}</CardGroupLabel>
        <MenuRow
          Icon={Palette}
          label={t("database.graph.noColour")}
          selected={!graph?.colorPropertyId}
          onClick={() => set({ colorPropertyId: null })}
        />
        {colorProperties.map((property) => (
          <MenuRow
            key={property.id}
            Icon={Palette}
            label={property.name}
            selected={graph?.colorPropertyId === property.id}
            onClick={() => set({ colorPropertyId: property.id })}
          />
        ))}
      </CardItemGroup>

      <CardItemGroup>
        <CardGroupLabel>{t("database.graph.background")}</CardGroupLabel>
        {BACKGROUNDS.map(({ kind, Icon }) => (
          <MenuRow
            key={kind}
            Icon={Icon}
            label={t(`database.graph.grounds.${kind}`)}
            selected={(graph?.background ?? "dots") === kind}
            onClick={() => set({ background: kind })}
          />
        ))}
      </CardItemGroup>

      <CardItemGroup>
        <CardGroupLabel>{t("database.graph.key")}</CardGroupLabel>
        <div className="db-graph-panel__key">
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
        </div>
        <div className="db-graph-panel__key">
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
        </div>
        <div className="db-graph-panel__key">
          <svg width="26" height="14" aria-hidden="true">
            <circle className="db-graph-panel__blob" cx="7" cy="7" r="3" />
            <circle className="db-graph-panel__blob" cx="18" cy="7" r="6" />
          </svg>
          {t("database.graph.keySize")}
        </div>
      </CardItemGroup>

      <CardItemGroup>
        <CardGroupLabel>{t("database.graph.moving")}</CardGroupLabel>
        {["wheel", "drag", "middle", "frame", "unpin"].map((how) => (
          <div key={how} className="db-graph-panel__how">
            {t(`database.graph.how.${how}`)}
          </div>
        ))}
      </CardItemGroup>
    </div>
  );
}

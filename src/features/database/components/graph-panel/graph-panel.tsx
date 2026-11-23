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
  Clock,
  Group,
  Hash,
  Link2,
  Palette,
  Plus,
  Search,
  Share2,
  Sparkles,
  TypeOutline,
} from "src/components/icons";
import { relationRecordIds } from "src/lib/relation-ids";
import { pageLinkIds } from "../../utils/page-links";
import type { UseDatabaseReturn } from "../../hooks";
import { useDatabaseContext } from "../../context/database-context";
import {
  buildGraph,
  linkCounts,
  linkProperties,
  relationProperties,
} from "../../utils/graph-model";
import { busiest } from "../../utils/graph-minimap";
import { matching } from "../../utils/graph-focus";
import { setGraphSession, useGraphSession } from "../../utils/graph-session";
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

  // ── Finding your way about ────────────────────────────────────────────
  //
  // The canvas is elsewhere on the page and holds the drawing; what is
  // typed here and what is picked there are kept in one place both can see
  // (graph-session.ts). The hubs and the orphans are worked out from the
  // records, the same way the canvas works out its own graph — ours alone,
  // since a page from another database is not this view's to jump to.
  const session = useGraphSession(view.id);
  const model = useMemo(
    () => buildGraph(sortedRecords, properties, graph, () => undefined),
    [sortedRecords, properties, graph],
  );
  const jumps = useMemo(() => {
    const hubs = busiest(model.nodes, 3);
    const orphans = model.nodes.filter((n) => n.degree === 0).slice(0, 3);
    return [...hubs, ...orphans];
  }, [model.nodes]);

  const look = (id: ID) => requestGraph(view.id, "look", id);
  const setQuery = (query: string) => setGraphSession(view.id, { query });
  /** ↵ in the find field: go to the first page it matches. */
  const goToFirstMatch = () => {
    const hits = matching(model.nodes, session.query);
    const hit = model.nodes.find((n) => hits.has(n.id));
    if (hit) look(hit.id);
  };
  const togglePathMode = () =>
    setGraphSession(view.id, {
      pathMode: !session.pathMode,
      picked: [],
      chain: [],
    });
  const titleOf = (id: ID) =>
    model.nodes.find((n) => n.id === id)?.title ||
    t("database.graph.untitled");

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
        <CardGroupLabel>{t("database.graph.find")}</CardGroupLabel>
        <label className="db-graph-panel__find">
          <Search className="tiptap-button-icon" size={15} />
          <input
            type="text"
            value={session.query}
            placeholder={t("database.graph.findPlaceholder")}
            aria-label={t("database.graph.find")}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                goToFirstMatch();
              }
              if (e.key === "Escape") setQuery("");
            }}
          />
        </label>
        {jumps.map((node) => (
          <MenuRow
            key={node.id}
            Icon={node.degree > 0 ? Share2 : Circle}
            label={node.title || t("database.graph.untitled")}
            sub={node.degree > 0 ? count(node.degree) : t("database.graph.noLinks")}
            onClick={() => look(node.id)}
          />
        ))}
      </CardItemGroup>

      <CardItemGroup>
        <CardGroupLabel>{t("database.graph.focus")}</CardGroupLabel>
        {/* How much of the canvas stays lit around the page under the
            pointer. One link away is what it has always done. */}
        <MenuRow
          label={t("database.graph.focusOff")}
          selected={(graph?.focusDepth ?? 1) === 0}
          onClick={() => set({ focusDepth: 0 })}
        />
        {([1, 2, 3] as const).map((hops) => (
          <MenuRow
            key={hops}
            label={t("database.graph.focusHops", { count: hops })}
            selected={(graph?.focusDepth ?? 1) === hops}
            onClick={() => set({ focusDepth: hops })}
          />
        ))}
        <MenuRow
          Icon={Link2}
          label={t("database.graph.path")}
          sub={
            session.pathMode && session.picked.length === 1
              ? t("database.graph.pathWaiting")
              : t("database.graph.pathSub")
          }
          toggle
          checked={session.pathMode}
          onToggle={togglePathMode}
        />
        {session.chain.length > 1 && (
          <div className="db-graph-panel__chain">
            {session.chain.map((step) => step.title || "—").join(" → ")}
            <span className="db-graph-panel__apart">
              {t("database.graph.chainApart", {
                count: session.chain.length - 1,
              })}
            </span>
          </div>
        )}
        {session.picked.length === 2 && session.chain.length === 0 && (
          <div className="db-graph-panel__chain">
            {t("database.graph.pathNone", {
              a: titleOf(session.picked[0]),
              b: titleOf(session.picked[1]),
            })}
          </div>
        )}
      </CardItemGroup>

      <CardItemGroup>
        <CardGroupLabel>{t("database.graph.looks")}</CardGroupLabel>
        <MenuRow
          Icon={Group}
          label={t("database.graph.cluster")}
          sub={t("database.graph.clusterSub")}
          toggle
          checked={!!graph?.cluster}
          onToggle={() => set({ cluster: !graph?.cluster })}
        />
        <MenuRow
          Icon={Clock}
          label={t("database.graph.fadeByAge")}
          sub={t("database.graph.fadeByAgeSub")}
          toggle
          checked={!!graph?.fadeByAge}
          onToggle={() => set({ fadeByAge: !graph?.fadeByAge })}
        />
        <MenuRow
          Icon={Hash}
          label={t("database.graph.linkNames")}
          sub={t("database.graph.linkNamesSub")}
          toggle
          checked={!!graph?.showLinkNames}
          onToggle={() => set({ showLinkNames: !graph?.showLinkNames })}
        />
        <MenuRow
          Icon={TypeOutline}
          label={t("database.graph.labelsByZoom")}
          sub={t("database.graph.labelsByZoomSub")}
          toggle
          checked={graph?.labelsByZoom !== false}
          onToggle={() => set({ labelsByZoom: graph?.labelsByZoom === false })}
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

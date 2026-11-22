import { memo, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { DatabaseProperty, GraphView, ID, Page } from "src/types";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Maximize2, Minus, Plus } from "src/components/icons";
import { usePagesBase } from "src/hooks/use-pages";
import { useDatabaseContext } from "../../context/database-context";
import { useDataSource } from "../../hooks/use-data-source";
import { useOpenRecord } from "../../hooks/use-open-record";
import {
  buildGraph,
  linkProperties,
  type GraphNode,
} from "../../utils/graph-model";
import {
  fitIntoView,
  layoutGraph,
  nodeRadius,
  type GraphPoint,
} from "../../utils/graph-layout";
import { cameraTransform } from "../../utils/graph-camera";
import { useGraphCanvas } from "./use-graph-canvas";
import { useGraphConnect, relationIdsOf } from "./use-graph-connect";
import "./database-graph-node-view.scss";

// The pages of a view, and what joins them, on a canvas.
//
// What joins them is anything that does: a link written in a page, a
// mention of one, or a relation property. Folio does not have to guess the
// way a notes app does, but it should not be fussy either — a connection is
// a connection, and the graph is the one place they are all the same thing.
//
// Drawn in SVG: a node is a real element, so it can be clicked, focused and
// read out, and the whole thing stays in the stylesheet with everything
// else. Moved, zoomed and dragged about by use-graph-canvas.

const BOX = { width: 1000, height: 600 };

function DatabaseGraphNodeViewImpl() {
  const { t } = useTranslation();
  const { db, source, sortedRecords } = useDatabaseContext();
  const view = db.activeView?.type === "graph" ? db.activeView : undefined;
  const openRecord = useOpenRecord(db.activeView);
  const { setCellValue, updatePropertiesAsync } = useDataSource(source?.id);

  // Pages linked from elsewhere: another database's rows, or ones this
  // view's filters left out. Looked up, not fetched — they are already in
  // hand for everything else on the page.
  const { data: allPages } = usePagesBase<Page[]>((pages) => pages);
  const pageById = useMemo(() => {
    const map = new Map<ID, Page>();
    for (const page of allPages ?? []) {
      if (page.deletedAt == null) map.set(page.id, page);
    }
    return map;
  }, [allPages]);

  const graph = useMemo(
    () =>
      buildGraph(sortedRecords, source?.properties ?? [], view, (id) =>
        pageById.get(id),
      ),
    [sortedRecords, source?.properties, view, pageById],
  );

  // Where everything sits: worked out when the graph itself changes, and
  // seeded, so the same pages settle in the same places each time this view
  // is opened rather than rearranging themselves under the person.
  const pinned = view?.pinned;
  const positions = useMemo(() => {
    const settled = layoutGraph(graph.nodes, graph.edges, {
      ...BOX,
      pinned: pinned ?? {},
    });
    // Once anything has been put somewhere on purpose, the canvas stops
    // rearranging itself around it.
    const anyPinned = !!pinned && Object.keys(pinned).length > 0;
    return anyPinned ? settled : fitIntoView(settled, BOX).at;
  }, [graph, pinned]);

  const [held, setHeld] = useState<ID | null>(null);
  const near = useCallback(
    (id: ID) => held === id || !!graph.neighbours.get(held ?? "")?.has(id),
    [held, graph.neighbours],
  );

  /** A node dropped somewhere stays there, for everyone. */
  const pinNode = useCallback(
    (id: ID, at: GraphPoint) => {
      if (!view) return;
      db.updateView(view.id, {
        pinned: { ...(view.pinned ?? {}), [id]: at },
      } as Partial<GraphView>);
    },
    [db, view],
  );

  // The relation a drag writes to. Plain relations first: a dependency says
  // "this blocks that" and sub-items say "this is inside that", neither of
  // which is what dragging one page onto another means.
  const connectProperty = useMemo(() => {
    const drawn = linkProperties(source?.properties ?? [], view);
    const plain = drawn.find(
      (p) =>
        p.config.type === "relation" &&
        !p.config.dependency &&
        !p.config.subItems,
    );
    return plain ?? drawn[0] ?? null;
  }, [source?.properties, view]);

  const recordById = useMemo(() => {
    const map = new Map<ID, Page>();
    for (const r of sortedRecords) map.set(r.id, r);
    return map;
  }, [sortedRecords]);

  const linksOf = useCallback(
    (id: ID) =>
      connectProperty
        ? relationIdsOf(
            (recordById.get(id) ?? pageById.get(id))?.values as
              Record<string, unknown> | undefined,
            connectProperty.id,
          )
        : [],
    [connectProperty, recordById, pageById],
  );

  // The canvas first: the link gesture needs to know where the view is
  // looking, and the canvas hands a ring-press over to it.
  const canvas = useGraphCanvas({
    box: BOX,
    onMoveNode: pinNode,
    onOpen: openRecord,
    onConnectStart: (id, event) => connect.onPointerDown(event, id),
  });

  const connect = useGraphConnect({
    property: connectProperty,
    linksOf,
    setCellValue,
    openRecord,
    box: BOX,
    camera: canvas.camera,
  });

  /** Make the relation a graph needs, when the database has none: dragging
   *  writes a relation, and with nowhere to write it the gesture can only
   *  do nothing, which is the worst a gesture can do. */
  const addRelation = useCallback(() => {
    if (!source) return;
    const id = () =>
      crypto.randomUUID?.() ??
      `p_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const outward = id();
    const inward = id();
    void updatePropertiesAsync([
      ...(source.properties ?? []),
      {
        id: outward,
        name: t("database.graph.relatedTo"),
        config: {
          type: "relation",
          targetSourceId: source.id,
          showOnTarget: true,
          mirrorPropertyId: inward,
        },
        width: 200,
      } as DatabaseProperty,
      {
        id: inward,
        name: t("database.graph.relatedFrom"),
        config: {
          type: "relation",
          targetSourceId: source.id,
          showOnTarget: false,
          mirrorPropertyId: outward,
        },
        width: 200,
      } as DatabaseProperty,
    ]);
  }, [source, updatePropertiesAsync, t]);

  const colors = useMemo(() => {
    const keys: string[] = [];
    for (const node of graph.nodes)
      if (node.colorKey && !keys.includes(node.colorKey))
        keys.push(node.colorKey);
    return new Map(keys.map((key, i) => [key, PALETTE[i % PALETTE.length]]));
  }, [graph.nodes]);

  const at = useCallback(
    (id: ID): GraphPoint | undefined =>
      canvas.gesture.moving === id && canvas.gesture.movingAt
        ? canvas.gesture.movingAt
        : positions.get(id),
    [canvas.gesture, positions],
  );

  if (graph.nodes.length === 0) {
    return (
      <div className="db-graph db-graph--empty">
        <p>{t("database.graph.empty")}</p>
      </div>
    );
  }

  const { camera } = canvas;

  return (
    <div className="db-graph" data-type="database-graph">
      <div className="db-graph__bar">
        {[...colors.entries()].map(([key, color]) => (
          <span key={key} className="db-graph__key">
            <span className="db-graph__dot" style={{ background: color }} />
            {key}
          </span>
        ))}
        <span className="db-graph__spacer" />
        {connect.canConnect ? (
          <span className="db-graph__key db-graph__key--hint">
            {t("database.graph.connectWith", {
              name: connectProperty?.name ?? "",
            })}
          </span>
        ) : (
          <Button variant="ghost" onClick={addRelation}>
            <Plus className="tiptap-button-icon" size={15} />
            <span className="tiptap-button-text">
              {t("database.graph.addRelation")}
            </span>
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={canvas.zoomOut}
          aria-label={t("database.graph.zoomOut")}
        >
          <Minus className="tiptap-button-icon" size={15} />
        </Button>
        <span className="db-graph__zoom">{Math.round(camera.zoom * 100)}%</span>
        <Button
          variant="ghost"
          onClick={canvas.zoomIn}
          aria-label={t("database.graph.zoomIn")}
        >
          <Plus className="tiptap-button-icon" size={15} />
        </Button>
        <Button
          variant="ghost"
          onClick={canvas.reset}
          aria-label={t("database.graph.fit")}
        >
          <Maximize2 className="tiptap-button-icon" size={15} />
          <span className="tiptap-button-text">{t("database.graph.fit")}</span>
        </Button>
      </div>

      <svg
        className="db-graph__canvas"
        viewBox={`0 0 ${BOX.width} ${BOX.height}`}
        onWheel={canvas.onWheel}
        onPointerDown={canvas.onBackgroundPointerDown}
        onPointerLeave={() => setHeld(null)}
      >
        <defs>
          {graph.nodes.map((node) =>
            node.image ? (
              <clipPath
                key={node.id}
                id={`db-graph-clip-${node.id}`}
                clipPathUnits="objectBoundingBox"
              >
                <circle cx="0.5" cy="0.5" r="0.5" />
              </clipPath>
            ) : null,
          )}
        </defs>

        <g transform={cameraTransform(camera, BOX)}>
          {graph.edges.map((edge, i) => {
            const a = at(edge.from);
            const b = at(edge.to);
            if (!a || !b) return null;
            const lit = held ? edge.from === held || edge.to === held : false;
            return (
              <line
                key={`${edge.from}>${edge.to}>${edge.propertyId ?? "link"}>${i}`}
                className="db-graph__edge"
                data-kind={edge.kind}
                data-lit={lit || undefined}
                data-dim={held && !lit ? "" : undefined}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
              />
            );
          })}

          {connect.draft &&
            (() => {
              const from = at(connect.draft.from);
              if (!from) return null;
              return (
                <line
                  className="db-graph__edge db-graph__edge--draft"
                  data-refused={
                    connect.draft.over && !connect.draft.valid ? "" : undefined
                  }
                  x1={from.x}
                  y1={from.y}
                  x2={connect.draft.at.x}
                  y2={connect.draft.at.y}
                />
              );
            })()}

          {graph.nodes.map((node) => {
            const point = at(node.id);
            if (!point) return null;
            return (
              <Node
                key={node.id}
                node={node}
                at={point}
                color={node.colorKey ? colors.get(node.colorKey) : undefined}
                state={held ? (near(node.id) ? "near" : "dim") : "rest"}
                isHeld={held === node.id}
                linking={
                  connect.draft?.from === node.id
                    ? "from"
                    : connect.draft?.over === node.id
                      ? connect.draft.valid
                        ? "over"
                        : "refused"
                      : undefined
                }
                canConnect={connect.canConnect}
                onHold={setHeld}
                onPointerDown={canvas.onNodePointerDown}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}

function Node({
  node,
  at,
  color,
  state,
  isHeld,
  linking,
  canConnect,
  onHold,
  onPointerDown,
}: {
  node: GraphNode;
  at: GraphPoint;
  color: string | undefined;
  state: "rest" | "near" | "dim";
  isHeld: boolean;
  linking: "from" | "over" | "refused" | undefined;
  canConnect: boolean;
  onHold: (id: ID | null) => void;
  onPointerDown: (event: React.PointerEvent, id: ID, ring: boolean) => void;
}) {
  // Its links make it bigger, but a page is a page: never a speck.
  const r = nodeRadius(node.degree);
  return (
    <g
      className="db-graph__node"
      data-state={state}
      data-held={isHeld || undefined}
      data-foreign={!node.own || undefined}
      data-node-id={node.id}
      data-linking={linking}
      transform={`translate(${at.x} ${at.y})`}
      role="button"
      tabIndex={0}
      onPointerEnter={() => onHold(node.id)}
      onFocus={() => onHold(node.id)}
      // Press to open the page, drag to move it about; the ring around it
      // draws a link instead (use-graph-canvas.ts).
      onPointerDown={(e) => onPointerDown(e, node.id, false)}
    >
      <circle
        className="db-graph__face"
        r={r}
        style={color ? { fill: color } : undefined}
      />
      {node.image && (
        <image
          href={node.image}
          x={-r}
          y={-r}
          width={r * 2}
          height={r * 2}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#db-graph-clip-${node.id})`}
        />
      )}
      {!node.image && node.icon && (
        <text className="db-graph__icon" y={r * 0.35} fontSize={r}>
          {node.icon}
        </text>
      )}
      <circle className="db-graph__rim" r={r} />
      {canConnect && (
        // The ring: a drag from here joins this page to another.
        <circle
          className="db-graph__ring"
          r={r + 5}
          onPointerDown={(e) => onPointerDown(e, node.id, true)}
        />
      )}
      <text className="db-graph__label" y={r + 16}>
        {node.title || "—"}
      </text>
    </g>
  );
}

/** Node colours, in the order a database's values first appear. */
const PALETTE = [
  "var(--tt-color-blue-inc-1, #4f7dd1)",
  "var(--tt-color-green-inc-1, #4a8f5b)",
  "var(--tt-color-orange-inc-1, #c2893a)",
  "var(--tt-color-purple-inc-1, #8b78ff)",
  "var(--tt-color-red-inc-1, #d1584f)",
  "var(--tt-color-yellow-inc-1, #c9a227)",
];

export const DatabaseGraphNodeView = memo(DatabaseGraphNodeViewImpl);

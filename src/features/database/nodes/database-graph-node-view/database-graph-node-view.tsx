import { memo, useCallback, useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type {
  DatabaseProperty,
  GraphBackground,
  GraphView,
  ID,
  Page,
} from "src/types";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "src/components/tiptap-ui-primitive/dropdown-menu";
import {
  ChevronDown,
  Maximize2,
  Minus,
  Plus,
  Share2,
  X,
} from "src/components/icons";
import { usePagesBase } from "src/hooks/use-pages";
import { useDatabaseContext } from "../../context/database-context";
import { useDataSource } from "../../hooks/use-data-source";
import { useOpenRecord } from "../../hooks/use-open-record";
import {
  buildGraph,
  linkCounts,
  linkProperties,
  relationProperties,
  type GraphNode,
} from "../../utils/graph-model";
import {
  busiest,
  fromMinimap,
  minimapFit,
  minimapViewport,
  onMinimap,
} from "../../utils/graph-minimap";
import {
  fitIntoView,
  layoutGraph,
  nodeRadius,
  type GraphPoint,
} from "../../utils/graph-layout";
import {
  cameraTransform,
  visibleRect,
  type Camera,
} from "../../utils/graph-camera";
import { useGraphCanvas } from "./use-graph-canvas";
import { useGraphConnect, relationIdsOf } from "./use-graph-connect";
import { GraphConnectionsPanel } from "./graph-connections-panel";
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

const BACKGROUNDS: GraphBackground[] = ["dots", "grid", "glow"];

function DatabaseGraphNodeViewImpl() {
  const { t } = useTranslation();
  const { db, source, sortedRecords } = useDatabaseContext();
  const view = db.activeView?.type === "graph" ? db.activeView : undefined;
  const openRecord = useOpenRecord(db.activeView);
  const { setCellValue, updatePropertiesAsync } = useDataSource(source?.id);
  // Ids of this view's own, so two graphs on one page cannot borrow each
  // other's ground or each other's clipped covers.
  const uid = useId().replace(/:/g, "");

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

  /** ⌥-press: the node goes back to being placed by the layout. */
  const unpinNode = useCallback(
    (id: ID) => {
      if (!view?.pinned?.[id]) return;
      const rest = { ...view.pinned };
      delete rest[id];
      db.updateView(view.id, { pinned: rest } as Partial<GraphView>);
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

  // Opened over the page, the way a picture is: the one place a plain wheel
  // may zoom, because there is no page left under it to scroll.
  const [focused, setFocused] = useState(false);
  const background = view?.background ?? "dots";

  // The canvas first: the link gesture needs to know where the view is
  // looking, and the canvas hands a ring-press over to it.
  const canvas = useGraphCanvas({
    box: BOX,
    viewId: view?.id,
    points: positions,
    neighbours: graph.neighbours,
    wheelZooms: focused,
    onMoveNode: pinNode,
    onOpen: openRecord,
    onUnpin: unpinNode,
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

  // The wheel, listened for by hand: React's own wheel is passive, and a
  // zoom that cannot stop ⌘-wheel from zooming the whole page with it is
  // worse than no zoom at all.
  //
  // Held as state rather than in a ref, because opening the graph over the
  // page moves the canvas into a portal: the element is made again there,
  // and a ref would leave the listener on the one that was thrown away.
  const [surface, setSurface] = useState<SVGSVGElement | null>(null);
  const onWheel = canvas.onWheel;
  useEffect(() => {
    if (!surface) return;
    surface.addEventListener("wheel", onWheel, { passive: false });
    return () => surface.removeEventListener("wheel", onWheel);
  }, [surface, onWheel]);

  // Over the page: Escape closes it, and the page behind does not scroll
  // while it is open — the same bargain the image lightbox makes.
  useEffect(() => {
    if (!focused) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setFocused(false);
    };
    window.addEventListener("keydown", onKey, true);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = overflow;
    };
  }, [focused]);

  const setBackground = useCallback(
    (next: GraphBackground) => {
      if (!view) return;
      db.updateView(view.id, { background: next } as Partial<GraphView>);
    },
    [db, view],
  );

  // ── What the connections panel shows, and what it changes ───────────────
  //
  // Everything here is a view setting, not a preference of whoever opened
  // it: a graph with half its relations switched off is a different view of
  // the same database, and the next person to open it should see the graph
  // this one was looking at.
  const relations = useMemo(() => {
    const all = relationProperties(source?.properties ?? []);
    const drawn = new Set(
      linkProperties(source?.properties ?? [], view).map((p) => p.id),
    );
    const counts = linkCounts(sortedRecords, source?.properties ?? []);
    return {
      choices: all.map((property) => ({
        property,
        drawn: drawn.has(property.id),
        count: counts.byProperty.get(property.id) ?? 0,
      })),
      pageLinks: counts.pageLinks,
    };
  }, [source?.properties, view, sortedRecords]);

  /** Switch one relation on or off. Empty means all, so switching the last
   *  one off has to say so by listing none — which is what "all" looks
   *  like. Dropping to nothing drawn at all is not a graph, so the first
   *  switch-off writes the rest out in full instead. */
  const toggleRelation = useCallback(
    (id: ID, drawn: boolean) => {
      if (!view) return;
      const all = relations.choices.map((c) => c.property.id);
      const now = new Set(
        view.linkPropertyIds?.length ? view.linkPropertyIds : all,
      );
      if (drawn) now.add(id);
      else now.delete(id);
      const next = all.filter((p) => now.has(p));
      db.updateView(view.id, {
        linkPropertyIds: next.length === all.length ? [] : next,
      } as Partial<GraphView>);
    },
    [db, view, relations.choices],
  );

  const setViewFlag = useCallback(
    (patch: Partial<GraphView>) => {
      if (!view) return;
      db.updateView(view.id, patch as Partial<GraphView>);
    },
    [db, view],
  );

  const colorProperties = useMemo(
    () =>
      (source?.properties ?? []).filter(
        (p) =>
          p.config.type === "select" ||
          p.config.type === "status" ||
          p.config.type === "multi_select",
      ),
    [source?.properties],
  );

  // Counted from the records rather than the drawing: when they are being
  // left out there is nothing in the drawing to count, and the number is
  // the whole reason the switch is worth offering.
  const unlinked = useMemo(
    () => sortedRecords.filter((r) => !graph.neighbours.has(r.id)).length,
    [sortedRecords, graph.neighbours],
  );

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

  const body = (
    <div
      className="db-graph"
      data-type="database-graph"
      data-open={focused || undefined}
    >
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              aria-label={t("database.graph.connections")}
            >
              <Share2 className="tiptap-button-icon" size={15} />
              <span className="tiptap-button-text">
                {t("database.graph.connections")}
              </span>
              <ChevronDown className="tiptap-button-icon-sub" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <GraphConnectionsPanel
              relations={relations.choices}
              pageLinks={{
                drawn: view?.showPageLinks !== false,
                count: relations.pageLinks,
              }}
              colorProperties={colorProperties}
              colorPropertyId={view?.colorPropertyId ?? null}
              colorOf={(node) =>
                node.colorKey ? colors.get(node.colorKey) : undefined
              }
              hideUnlinked={!!view?.hideUnlinked}
              unlinked={unlinked}
              mostConnected={busiest(graph.nodes)}
              pages={graph.nodes.length}
              connections={graph.edges.length}
              onToggleRelation={toggleRelation}
              onTogglePageLinks={(drawn) =>
                setViewFlag({ showPageLinks: drawn })
              }
              onToggleUnlinked={(shown) =>
                setViewFlag({ hideUnlinked: !shown })
              }
              onColorBy={(id) => setViewFlag({ colorPropertyId: id })}
              onGoTo={canvas.frame}
            />
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" aria-label={t("database.graph.background")}>
              <Swatch kind={background} />
              <span className="tiptap-button-text">
                {t(`database.graph.grounds.${background}`)}
              </span>
              <ChevronDown className="tiptap-button-icon-sub" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <Card style={{ padding: 8 }}>
              <CardItemGroup style={{ width: "100%" }}>
                {BACKGROUNDS.map((kind) => (
                  <DropdownMenuItem key={kind} asChild>
                    <Button
                      variant="ghost"
                      data-active-state={background === kind ? "on" : "off"}
                      style={{ justifyContent: "flex-start", width: "100%" }}
                      onClick={() => setBackground(kind)}
                    >
                      <Swatch kind={kind} />
                      <span className="tiptap-button-text">
                        {t(`database.graph.grounds.${kind}`)}
                      </span>
                    </Button>
                  </DropdownMenuItem>
                ))}
              </CardItemGroup>
            </Card>
          </DropdownMenuContent>
        </DropdownMenu>

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
          onClick={canvas.fit}
          aria-label={t("database.graph.fit")}
        >
          <span className="tiptap-button-text">{t("database.graph.fit")}</span>
        </Button>
        {!focused && (
          <Button
            variant="ghost"
            onClick={() => setFocused(true)}
            aria-label={t("database.graph.open")}
          >
            <Maximize2 className="tiptap-button-icon" size={15} />
          </Button>
        )}
      </div>

      <div className="db-graph__stage">
        <svg
          ref={setSurface}
          className="db-graph__canvas"
          data-panning={canvas.gesture.panning || undefined}
          viewBox={`0 0 ${BOX.width} ${BOX.height}`}
          tabIndex={0}
          aria-label={t("database.graph.canvas")}
          onPointerDown={canvas.onBackgroundPointerDown}
          onKeyDown={canvas.onKeyDown}
          onPointerLeave={() => setHeld(null)}
        >
          <defs>
            <GroundPaint
              id={`${uid}-ground`}
              kind={background}
              camera={camera}
            />
            {graph.nodes.map((node) =>
              node.image ? (
                <clipPath
                  key={node.id}
                  id={`${uid}-clip-${node.id}`}
                  clipPathUnits="objectBoundingBox"
                >
                  <circle cx="0.5" cy="0.5" r="0.5" />
                </clipPath>
              ) : null,
            )}
          </defs>

          <g transform={cameraTransform(camera, BOX)}>
            <Ground
              id={`${uid}-ground`}
              camera={camera}
              onDoubleClick={canvas.fit}
            />

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
                      connect.draft.over && !connect.draft.valid
                        ? ""
                        : undefined
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
                  clipId={`${uid}-clip-${node.id}`}
                  color={node.colorKey ? colors.get(node.colorKey) : undefined}
                  state={held ? (near(node.id) ? "near" : "dim") : "rest"}
                  isHeld={held === node.id}
                  isMoving={canvas.gesture.moving === node.id}
                  isPlaced={!!view?.pinned?.[node.id]}
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

        <Minimap
          nodes={graph.nodes}
          points={positions}
          camera={camera}
          colorOf={(node) =>
            node.colorKey ? colors.get(node.colorKey) : undefined
          }
          onLookAt={canvas.lookAt}
          label={t("database.graph.map")}
        />
      </div>
    </div>
  );

  if (!focused) return body;

  // Over the page, like a picture opened from the text: a backdrop, a way
  // out at the top, and a click on the dark closes it.
  return createPortal(
    <div
      className="db-graph-open"
      role="dialog"
      aria-modal="true"
      aria-label={t("database.graph.canvas")}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) setFocused(false);
      }}
    >
      <Button
        variant="ghost"
        className="db-graph-open__close"
        aria-label={t("database.graph.close")}
        onClick={() => setFocused(false)}
      >
        <X className="tiptap-button-icon" />
      </Button>
      {body}
    </div>,
    document.body,
  );
}

/**
 * The small map in the corner.
 *
 * A canvas you can pan forever is a canvas you can get lost on: pages end
 * up off the edge with nothing to say which edge. Everything fits in here,
 * the frame shows what the canvas is looking at, and a press on it goes
 * there.
 */
const MAP = { width: 170, height: 112 };

function Minimap({
  nodes,
  points,
  camera,
  colorOf,
  onLookAt,
  label,
}: {
  nodes: GraphNode[];
  points: Map<ID, GraphPoint>;
  camera: Camera;
  colorOf: (node: GraphNode) => string | undefined;
  onLookAt: (at: GraphPoint) => void;
  label: string;
}) {
  const spots = nodes
    .map((node) => ({ node, at: points.get(node.id) }))
    .filter((s): s is { node: GraphNode; at: GraphPoint } => !!s.at);
  if (spots.length === 0) return null;
  const fit = minimapFit(
    spots.map((s) => s.at),
    BOX,
    MAP,
    camera,
  );
  const frame = minimapViewport(fit, camera, BOX);

  const go = (event: React.PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    // The mapping as it is now, kept for the whole drag: it is worked out
    // from where the camera is looking, and re-reading it mid-drag would
    // move the map under the finger that is dragging it.
    const held = fit;
    const scale = rect.width ? MAP.width / rect.width : 1;
    const look = (e: { clientX: number; clientY: number }) =>
      onLookAt(
        fromMinimap(held, {
          x: (e.clientX - rect.left) * scale,
          y: (e.clientY - rect.top) * scale,
        }),
      );
    look(event);
    const move = (e: PointerEvent) => look(e);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <svg
      className="db-graph__map"
      viewBox={`0 0 ${MAP.width} ${MAP.height}`}
      width={MAP.width}
      height={MAP.height}
      aria-label={label}
      onPointerDown={go}
    >
      <rect
        className="db-graph__map-frame"
        x={frame.x}
        y={frame.y}
        width={frame.width}
        height={frame.height}
        rx={3}
      />
      {spots.map(({ node, at }) => {
        const on = onMinimap(fit, at);
        return (
          <circle
            key={node.id}
            className="db-graph__map-spot"
            cx={on.x}
            cy={on.y}
            r={node.degree > 0 ? 2.4 : 1.6}
            style={colorOf(node) ? { fill: colorOf(node) } : undefined}
          />
        );
      })}
    </svg>
  );
}

/**
 * The ground the graph stands on.
 *
 * Drawn inside the camera's own group and in the graph's own coordinates,
 * so it pans and scales with everything standing on it — that is what tells
 * a canvas from a picture that changes size. What stays the same size is
 * the ink: a dot is a dot and a rule is a hairline however far in the view
 * is, so only the spacing between them grows.
 */
function Ground({
  id,
  camera,
  onDoubleClick,
}: {
  id: string;
  camera: Camera;
  onDoubleClick: () => void;
}) {
  return (
    <rect
      className="db-graph__ground"
      {...visibleRect(camera, BOX)}
      fill={`url(#${id})`}
      // Twice on the ground itself, never on a page: everything in view.
      onDoubleClick={onDoubleClick}
    />
  );
}

/** The paint the ground is filled with: one pattern, or one gradient. */
function GroundPaint({
  id,
  kind,
  camera,
}: {
  id: string;
  kind: GraphBackground;
  camera: Camera;
}) {
  if (kind === "grid")
    return (
      <pattern id={id} width={32} height={32} patternUnits="userSpaceOnUse">
        <path
          className="db-graph__rule"
          d="M32 0H0V32"
          fill="none"
          strokeWidth={1 / camera.zoom}
        />
      </pattern>
    );
  if (kind === "glow")
    return (
      <radialGradient
        id={id}
        gradientUnits="userSpaceOnUse"
        cx={BOX.width / 2}
        cy={BOX.height / 2}
        r={BOX.width * 0.62}
      >
        <stop className="db-graph__glow-near" offset="0" />
        <stop className="db-graph__glow-far" offset="1" />
      </radialGradient>
    );
  return (
    <pattern id={id} width={32} height={32} patternUnits="userSpaceOnUse">
      <circle className="db-graph__speck" cx={16} cy={16} r={1 / camera.zoom} />
    </pattern>
  );
}

/** What a ground looks like, small enough for a menu. */
function Swatch({ kind }: { kind: GraphBackground }) {
  return (
    <svg
      className="db-graph__swatch"
      viewBox="0 0 16 16"
      width={16}
      height={16}
      aria-hidden="true"
    >
      <rect className="db-graph__swatch-bed" width={16} height={16} rx={3} />
      {kind === "dots" &&
        [4, 8, 12].map((y) =>
          [4, 8, 12].map((x) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={0.9} />
          )),
        )}
      {kind === "grid" && (
        <path d="M5.5 1v14M10.5 1v14M1 5.5h14M1 10.5h14" fill="none" />
      )}
      {kind === "glow" && <circle cx={8} cy={8} r={5} />}
    </svg>
  );
}

function Node({
  node,
  at,
  clipId,
  color,
  state,
  isHeld,
  isMoving,
  isPlaced,
  linking,
  canConnect,
  onHold,
  onPointerDown,
}: {
  node: GraphNode;
  at: GraphPoint;
  clipId: string;
  color: string | undefined;
  state: "rest" | "near" | "dim";
  isHeld: boolean;
  isMoving: boolean;
  isPlaced: boolean;
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
      data-moving={isMoving || undefined}
      data-placed={isPlaced || undefined}
      data-foreign={!node.own || undefined}
      data-node-id={node.id}
      data-linking={linking}
      transform={`translate(${at.x} ${at.y})`}
      role="button"
      tabIndex={0}
      onPointerEnter={() => onHold(node.id)}
      onFocus={() => onHold(node.id)}
      // Press to open the page, drag to move it about; the ring around it
      // draws a link, ⌥ hands it back to the layout and ⇧ frames it with
      // everything it touches (use-graph-canvas.ts).
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
          clipPath={`url(#${clipId})`}
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

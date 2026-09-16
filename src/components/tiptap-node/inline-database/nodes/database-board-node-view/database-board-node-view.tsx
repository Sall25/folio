import { Plus } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import "./database-board-node-view.scss";
import { useBoardLayout } from "../../hooks";
import { NodeViewContent, useCurrentEditor } from "@tiptap/react";
import { useDatabaseContext } from "../../context/database-context";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Cell } from "../../components/cells/cell";
import { makePage } from "src/utils/make-page";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { BoardColumnMenu } from "../../components/board-column-menu";
import type { BoardView, DatabaseProperty, ID } from "src/types";
import type { DragStorage } from "../../extensions";

const syntheticRecord = makePage({ ownerId: null });

const CARD_SIZE_WIDTH: Record<"small" | "medium" | "large", number> = {
  small: 200,
  medium: 260,
  large: 340,
};

export function DatabaseBoardNodeViewImpl() {
  const [menuVisible, setMenuVisible] = useState<{
    id: ID | null;
    value: boolean;
  }>({ id: null, value: false });
  const [menuOpen, setMenuOpen] = useState(false);
  const { db, attrs, source, sortedRecords, onNewRecordInGroup } =
    useDatabaseContext();

  const activeView = db.activeView as BoardView;
  const cardSize = activeView?.cardSize ?? "medium";
  const colWidth = CARD_SIZE_WIDTH[cardSize];

  const { boardLayout } = useBoardLayout(sortedRecords, source ?? null, db);
  const { columns } = boardLayout;

  // Set a board column's color = update the underlying group option's color in
  // the grouped property's config, then persist the property.
  const setColumnColor = useCallback(
    (columnId: string, color: string) => {
      if (!boardLayout.groupProp) return;
      const cfg = boardLayout.groupProp.config;
      const newColor = color === "default" ? null : color;

      let nextConfig;
      if (cfg.type === "select" || cfg.type === "multi_select") {
        nextConfig = {
          ...cfg,
          options: cfg.options.map((o) =>
            o.id === columnId ? { ...o, color: newColor } : o,
          ),
        };
      } else if (cfg.type === "status") {
        // Status: the column id maps to an item within a group. Update the item's
        // color (or the group's — depending on how col.id maps; see note below).
        nextConfig = {
          ...cfg,
          groups: cfg.groups.map((g) => ({
            ...g,
            items: g.items.map((it) =>
              it.id === columnId ? { ...it, color: newColor } : it,
            ),
          })),
        };
      } else {
        return; // checkbox / no-color group types
      }

      db.updateProperty(boardLayout.groupProp.id, {
        config: nextConfig as DatabaseProperty["config"],
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [boardLayout.groupProp, db.updateProperty],
  );

  const hideGroup = useCallback(
    (columnId: string) => {
      if (!activeView) return;
      const current = (activeView as BoardView).hiddenGroups ?? [];
      if (current.includes(columnId)) return;
      db.updateView(activeView.id, {
        hiddenGroups: [...current, columnId],
      } as Partial<BoardView>);
    },
    [db, activeView],
  );

  const { editor } = useCurrentEditor();
  const EDGE = 60;
  const SPEED = 14;
  const scrollRAF = useRef<number | null>(null);

  const autoScroll = useCallback((x: number, y: number) => {
    const scroller = document.querySelector<HTMLElement>(".db-node");
    if (!scroller) return;

    let dx = 0;

    if (x < EDGE) {
      dx = -SPEED;
    } else if (x > window.innerWidth - EDGE) {
      dx = SPEED;
    }
    let dy = 0;
    if (y < EDGE) dy = -SPEED;
    else if (y > window.innerHeight - EDGE) dy = SPEED;

    if (dx === 0 && dy === 0) {
      if (scrollRAF.current) {
        cancelAnimationFrame(scrollRAF.current);
        scrollRAF.current = null;
      }
      return;
    }
    if (scrollRAF.current) return;

    const step = () => {
      scroller.scrollLeft += dx;
      if (dy !== 0) window.scrollBy(0, dy);
      scrollRAF.current = requestAnimationFrame(step);
    };
    scrollRAF.current = requestAnimationFrame(step);
  }, []);

  const stopAutoScroll = useCallback(() => {
    if (scrollRAF.current) {
      cancelAnimationFrame(scrollRAF.current);
      scrollRAF.current = null;
    }
  }, []);

  useEffect(() => {
    const scroller = document.querySelector<HTMLElement>(".db-node");
    if (!scroller) return;
    const onOver = (e: DragEvent) => {
      const storage = editor?.storage.boardDrag as DragStorage;
      if (!storage?.isBoardActive() || !storage.draggingId) return;
      e.preventDefault();
      autoScroll(e.clientX, e.clientY);
    };
    scroller.addEventListener("dragover", onOver);
    return () => scroller.removeEventListener("dragover", onOver);
  }, [editor, autoScroll]);

  if (columns.length === 0) {
    return <div className="db-board-empty">No groups to display</div>;
  }

  return (
    <div
      className="db-board-grid"
      data-card-size={cardSize}
      data-database-id={attrs.id}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns.length}, ${colWidth}px)`,
        gridAutoRows: "min-content",
        alignItems: "start",
        gap: "0 8px",
      }}
      onDragOver={(event) => {
        if (!editor) return;
        const storage = editor.storage.boardDrag as DragStorage;
        if (!storage.isBoardActive() || !storage.draggingId) return;
        event.preventDefault();
        autoScroll(event.clientX, event.clientY);
      }}
      onDrop={stopAutoScroll}
      onDragEnd={stopAutoScroll}
    >
      {/* Column lane backgrounds — span the full column height, behind cards. */}
      {columns.map((c) =>
        c.color ? (
          <div
            key={`lane-${c.key}`}
            className="db-board-lane"
            style={{
              gridColumn: c.col + 1,
              // header (row 1) + its cards → span 1 + rows (+1 if you want to cover the New button)
              gridRow: `1 / span ${c.newRow - 1}`,
              // gridRow: `1 / ${c.newRow + 1}`,
              // gridRow: `1 / span ${c.newRow}`, // header + cards + New page row
              background: `color-mix(in srgb, ${c.color} ${c.color !== "var(--tt-color-highlight-gray)" ? "8%" : "100%"}, transparent)`,

              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
            }}
            contentEditable={false}
            aria-hidden
          />
        ) : null,
      )}

      {/* Column headers */}
      {columns.map((c) => (
        <div
          key={c.key}
          data-col-key={c.key}
          className="db-board-col-header"
          style={{ gridColumn: c.col + 1, gridRow: 1 }}
          onMouseOver={() => {
            if (menuVisible.value === true) return;
            setMenuVisible({ id: c.key, value: true });
          }}
          onMouseLeave={() => {
            if (menuOpen) return;
            setMenuVisible({ id: c.key, value: false });
          }}
        >
          {c.value != null && boardLayout.groupProp ? (
            <Cell
              property={boardLayout.groupProp}
              value={c.value}
              record={syntheticRecord /* a synthetic record (jus for show)*/}
              readonly
              properties={[]}
              onChange={() => {}}
              view={db.activeView}
            />
          ) : (
            <span className="db-board-col-header__empty">{c.label}</span>
          )}
          <span className="db-board-col-header__count">{c.rows}</span>

          <Spacer orientation="horizontal" />
          {menuVisible.id === c.key && menuVisible.value === true && (
            <BoardColumnMenu
              open={menuOpen}
              setOpen={setMenuOpen}
              columnId={c.key}
              columnColor={c.color}
              onSetColor={setColumnColor}
              onHideGroup={hideGroup}
            />
          )}
        </div>
      ))}

      {/* Cards — PM record nodes, each self-places via grid-column + grid-row */}
      <NodeViewContent as="div" className="db-board-grid__body" />

      {/* "New" per column — at the bottom of each column. Placed at a high row
          so it sits after the cards (grid-auto-rows stacks it below). */}
      {columns.map((c) => (
        <div
          key={`new-${c.key}`}
          style={{
            gridColumn: c.col + 1,
            gridRow: c.newRow,
            background: `color-mix(in srgb, ${c.color} ${c.color !== "var(--tt-color-highlight-gray)" ? "8%" : "100%"}, transparent)`,
            borderBottomLeftRadius: "var(--tt-radius-lg)",
            borderBottomRightRadius: "var(--tt-radius-lg)",
          }}
        >
          <Button
            type="button"
            className="db-board-col-footer__add"
            contentEditable={false}
            style={{
              margin: "8px 10px",
            }}
            onClick={() => onNewRecordInGroup(c.key)}
          >
            <Plus className="tiptap-button-icon" />
            <span className="tiptap-button-text">New Page</span>
          </Button>
        </div>
      ))}
    </div>
  );
}

export const DatabaseBoardNodeView = memo(DatabaseBoardNodeViewImpl);

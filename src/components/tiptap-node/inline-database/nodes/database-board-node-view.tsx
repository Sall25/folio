import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/core";
import { Plus } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { DatabaseToolbar } from "../components/database-toolbar";
import { useDatabase } from "../hooks/use-database";
import { DatabaseProvider } from "./database-provider";
import type {
  BoardView,
  DatabaseAttrs,
  SelectOption,
  StatusGroup,
} from "../types/types";
import "./database-board-node-view.scss";
import { SelectCellDisplay } from "../primitives/select-cell-display";
import { StatusCellDisplay } from "../primitives/status-cell-display";
import { CheckboxCellDisplay } from "../primitives/checkbox-cell-display";
import { useMemo, useRef } from "react";
import { useActivePage } from "src/components/tiptap-templates/simple/use-active-page";

// ── Column definition helpers ───────────────────────────────────────────────

const NONE_COLUMN_ID = "__none__";

interface ColumnDef {
  id: string;
  label: string;
  color?: string;
}

function getColumnDefs(
  attrs: DatabaseAttrs,
  groupByPropertyId: string,
): ColumnDef[] {
  const prop = attrs.properties.find((p) => p.id === groupByPropertyId);
  if (!prop) return [];

  const config = prop.config;

  if (config.type === "select" || config.type === "multi_select") {
    return config.options.map((o: SelectOption) => ({
      id: o.id,
      label: o.label,
      color: o.color,
    }));
  }

  if (config.type === "status") {
    return config.groups.flatMap((g) =>
      g.items.map((item) => ({
        id: item.id,
        label: item.name,
        color: item.color,
      })),
    );
  }

  if (config.type === "checkbox") {
    return [
      { id: "true", label: "Checked" },
      { id: "false", label: "Unchecked" },
    ];
  }

  return [];
}

// ── Main component ──────────────────────────────────────────────────────────

export function DatabaseBoardNodeView({
  node,
  editor,
  updateAttributes,
}: NodeViewProps) {
  const attrs = node.attrs as DatabaseAttrs;
  const onUpdateTitle = (title: string) =>
    updateAttributes({ ...attrs, title });
  const db = useDatabase(attrs, editor, onUpdateTitle);

  const activeView = db.activeView as BoardView | undefined;
  const groupByPropertyId = activeView?.groupByPropertyId ?? "";

  const { activePage } = useActivePage();

  const columnDefs = groupByPropertyId
    ? getColumnDefs(attrs, groupByPropertyId)
    : [];

  // "No [property]" column always first, matching Notion
  const groupProp = attrs.properties.find((p) => p.id === groupByPropertyId);

  // All columns including the none column — this is what records use
  // to compute their grid-column index (1-based)
  const allColumns: ColumnDef[] = [...columnDefs];

  const boardRef = useRef<HTMLDivElement>(null);

  const colWidth = useMemo(() => {
    const width = activePage?.settings.width === "full" ? 900 : 700;
    const gap = 12;
    const totalGaps = gap * (allColumns.length - 1);
    const padding = 80;
    // Divide evenly across all columns, minimum 200px
    return Math.max(
      200,
      Math.floor((width - padding - totalGaps) / allColumns.length),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allColumns.length, activePage?.settings.width]);

  // Serialize column defs and groupByPropertyId to CSS custom properties
  // so DatabaseRecordBoardView can read them without prop drilling
  const boardVars = {
    "--db-board-group-prop": JSON.stringify(groupByPropertyId),
    "--db-board-columns": JSON.stringify(allColumns),
    "--db-board-col-width": `${colWidth}px`,
  } as React.CSSProperties;
  if (!groupByPropertyId || columnDefs.length === 0) {
    return (
      <NodeViewWrapper>
        <DatabaseProvider
          attrs={attrs}
          db={db}
          editor={editor}
          updateAttributes={updateAttributes}
        >
          <CardItemGroup>
            <DatabaseToolbar
              attrs={attrs}
              db={db}
              onUpdateAttributes={(a) => updateAttributes(a)}
            />
            <div className="db-board-empty">
              <p>
                Add a Status or Select property, then set it as the group
                property to use board view.
              </p>
            </div>
            {/* NodeViewContent must always be rendered */}
            <div style={{ display: "none" }}>
              <NodeViewContent as="div" />
            </div>
          </CardItemGroup>
        </DatabaseProvider>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper>
      <DatabaseProvider
        attrs={attrs}
        db={db}
        editor={editor}
        updateAttributes={updateAttributes}
      >
        <CardItemGroup>
          <div className="db-board__toolbar-sticky">
            <DatabaseToolbar
              attrs={attrs}
              db={db}
              onUpdateAttributes={(a) => updateAttributes(a)}
            />
          </div>

          <div
            ref={boardRef}
            className="db-board"
            data-type="database-board"
            style={boardVars}
          >
            {/* Column headers — one per column, CSS grid places them */}
            <div
              className="db-board__headers"
              style={{
                gridTemplateColumns: `repeat(${allColumns.length}, var(--db-board-col-width, 260px))`,
              }}
            >
              {allColumns.map((col) => (
                <div key={col.id} className="db-board-col-header">
                  {groupProp?.config.type === "select" ? (
                    <SelectCellDisplay
                      value={
                        (
                          groupProp.config as { options: SelectOption[] }
                        ).options.find((o) => o.id === col.id) ?? null
                      }
                      options={
                        (groupProp.config as { options: SelectOption[] })
                          .options
                      }
                      readonly
                    />
                  ) : groupProp?.config.type === "status" ? (
                    <StatusCellDisplay
                      value={col.id}
                      groups={
                        (groupProp.config as { groups: StatusGroup[] }).groups
                      }
                      readonly
                    />
                  ) : groupProp?.config.type === "checkbox" ? (
                    <CheckboxCellDisplay value={col.id === "true"} readonly />
                  ) : (
                    <span className="db-board-col-header__label">
                      {col.label}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Record cards — each positions itself into the right column */}
            <div
              className="db-board__body"
              style={{
                gridTemplateColumns: `repeat(${allColumns.length}, var(--db-board-col-width, 260px))`,
              }}
            >
              <NodeViewContent as="div" className="db-board__records" />
            </div>

            {/* Per-column New buttons */}
            <div
              className="db-board__footers"
              style={{
                gridTemplateColumns: `repeat(${allColumns.length}, var(--db-board-col-width, 260px))`,
              }}
            >
              {allColumns.map((col) => (
                <Button
                  key={col.id}
                  variant="ghost"
                  className="db-board-col-footer__add"
                  onClick={() => {
                    editor.commands.addDatabaseRecord(node.attrs.id);
                    // Set the group value on the new record after it's created
                    setTimeout(() => {
                      if (!groupProp || col.id === NONE_COLUMN_ID) return;
                      let lastRecordId: string | null = null;
                      editor.state.doc.descendants((n) => {
                        if (n.type.name === "databaseRecord") {
                          lastRecordId = n.attrs.id;
                        }
                      });
                      if (!lastRecordId) return;

                      let newValue: unknown = null;
                      if (
                        groupProp.config.type === "select" ||
                        groupProp.config.type === "multi_select"
                      ) {
                        const option = (
                          groupProp.config as { options: SelectOption[] }
                        ).options.find((o) => o.id === col.id);
                        newValue =
                          groupProp.config.type === "multi_select"
                            ? [option]
                            : (option ?? null);
                      } else if (groupProp.config.type === "status") {
                        newValue = col.id;
                      } else if (groupProp.config.type === "checkbox") {
                        newValue = col.id === "true";
                      }

                      editor.commands.updateDatabaseCell(
                        attrs.id,
                        lastRecordId,
                        groupProp.id,
                        newValue,
                      );
                    }, 0);
                  }}
                >
                  <Plus className="tiptap-button-icon" />
                  <span className="tiptap-button-text">New</span>
                </Button>
              ))}
            </div>
          </div>
        </CardItemGroup>
      </DatabaseProvider>
    </NodeViewWrapper>
  );
}

import { Editor, useCurrentEditor } from "@tiptap/react";
import type { Node } from "@tiptap/pm/model";
import type { Page } from "src/components/tiptap-templates/simple/types";
import type {
  DatabaseAttrs,
  DatabaseProperty,
} from "src/components/tiptap-node/inline-database/types/types";
import { SelectCellDisplay } from "src/components/tiptap-node/inline-database/primitives/select-cell-display";
import { StatusCellDisplay } from "src/components/tiptap-node/inline-database/primitives/status-cell-display";
import { CheckboxCellDisplay } from "src/components/tiptap-node/inline-database/primitives/checkbox-cell-display";
import { MultiSelectCellDisplay } from "src/components/tiptap-node/inline-database/primitives/multi-select-cell-display";
import { DateCellDisplay } from "src/components/tiptap-node/inline-database/primitives/date-cell-display";
import { PROPERTY_TYPE_ICONS } from "src/components/tiptap-node/inline-database/types/property-type-meta";
import "./record-property-panel.scss";

interface RecordPropertyPanelProps {
  page: Page;
  editor: Editor | null;
}

interface ResolvedRecord {
  dbNode: Node;
  recordNode: Node;
  attrs: DatabaseAttrs;
}

function resolveRecord(
  editor: ReturnType<typeof useCurrentEditor>["editor"],
  databaseId: string,
  recordId: string,
): ResolvedRecord | null {
  if (!editor) return null;

  let result: ResolvedRecord | null = null;

  editor.state.doc.descendants((node) => {
    if (result) return false;
    if (node.type.name !== "database" || node.attrs.id !== databaseId) return;

    node.forEach((child) => {
      if (result) return;
      if (child.type.name !== "databaseRecord" || child.attrs.id !== recordId)
        return;
      result = {
        dbNode: node,
        recordNode: child,
        attrs: node.attrs as DatabaseAttrs,
      };
    });
  });

  return result;
}

function PropertyRow({
  prop,
  cell,
  // attrs,
  editor,
  databaseId,
  recordId,
}: {
  prop: DatabaseProperty;
  cell: Node;
  attrs: DatabaseAttrs;
  editor: NonNullable<ReturnType<typeof useCurrentEditor>["editor"]>;
  databaseId: string;
  recordId: string;
}) {
  const Icon = PROPERTY_TYPE_ICONS[prop.config.type];
  const value = cell.attrs.value;

  function updateCell(newValue: unknown) {
    editor.commands.updateDatabaseCell(databaseId, recordId, prop.id, newValue);
  }

  const renderValue = () => {
    switch (prop.config.type) {
      case "select":
        return (
          <SelectCellDisplay
            value={value}
            options={prop.config.options}
            onChange={(option) => updateCell(option)}
          />
        );
      case "status":
        return (
          <StatusCellDisplay
            value={value}
            groups={prop.config.groups}
            onChange={(item) => updateCell(item.id)}
          />
        );
      case "checkbox":
        return (
          <CheckboxCellDisplay
            value={value ?? false}
            onChange={() => updateCell(!value)}
          />
        );
      case "multi_select":
        return (
          <MultiSelectCellDisplay
            value={value ?? []}
            options={prop.config.options}
            onChange={(v) => updateCell(v)}
          />
        );
      case "date":
      case "created_time":
      case "edited_time":
        return (
          <DateCellDisplay value={value} onChange={(iso) => updateCell(iso)} />
        );
      case "number":
        return (
          <span className="record-prop-panel__value record-prop-panel__value--text">
            {value ?? "—"}
          </span>
        );
      case "url":
      case "email":
      case "phone":
        return (
          <span className="record-prop-panel__value record-prop-panel__value--text">
            {value ?? "—"}
          </span>
        );
      default:
        return null;
    }
  };

  const rendered = renderValue();
  if (!rendered) return null;

  return (
    <div className="record-prop-panel__row">
      <div className="record-prop-panel__label">
        <Icon size={13} className="record-prop-panel__label-icon" />
        <span>{prop.name}</span>
      </div>
      <div className="record-prop-panel__value-wrapper">{rendered}</div>
    </div>
  );
}

export function RecordPropertyPanel({
  page,
  editor,
}: RecordPropertyPanelProps) {
  if (!editor) return null;

  // Resolve databaseId and recordId directly from editor state by matching
  // titleCell.pageId — works even before databaseId/recordId are saved on page
  let databaseId: string | undefined;
  let recordId: string | undefined;

  editor.state.doc.descendants((node, pos) => {
    if (databaseId && recordId) return false;
    if (node.type.name !== "titleCell") return;
    if (node.attrs.pageId !== page.id) return;

    const $pos = editor.state.doc.resolve(pos);
    for (let d = $pos.depth; d > 0; d--) {
      const ancestor = $pos.node(d);
      if (ancestor.type.name === "databaseRecord" && !recordId) {
        recordId = ancestor.attrs.id;
      }
      if (ancestor.type.name === "database" && !databaseId) {
        databaseId = ancestor.attrs.id;
      }
      if (recordId && databaseId) break;
    }
    return false;
  });

  // Replace the old:
  // if (!page.databaseId || !page.recordId) return null;
  if (!databaseId || !recordId) return null;

  const resolved = resolveRecord(editor, databaseId, recordId);
  if (!resolved) return null;

  const { attrs, recordNode } = resolved;

  const cellMap = new Map<string, Node>();
  recordNode.forEach((cell) => {
    cellMap.set(cell.attrs.propertyId, cell);
  });

  const properties = attrs.properties.filter((p) => p.config.type !== "title");

  if (properties.length === 0) return null;

  return (
    <div className="record-prop-panel">
      {properties.map((prop) => {
        const cell = cellMap.get(prop.id);
        if (!cell) return null;
        return (
          <PropertyRow
            key={prop.id}
            prop={prop}
            cell={cell}
            attrs={attrs}
            editor={editor}
            databaseId={databaseId!}
            recordId={recordId!}
          />
        );
      })}
    </div>
  );
}

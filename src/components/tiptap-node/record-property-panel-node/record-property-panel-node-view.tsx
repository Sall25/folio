import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { Node } from "@tiptap/pm/model";
import type {
  DatabaseAttrs,
  DatabaseProperty,
} from "src/components/tiptap-node/inline-database/types/types";
import { SelectCellDisplay } from "src/components/tiptap-node/inline-database/primitives/select-cell-display";
import { StatusCellDisplay } from "src/components/tiptap-node/inline-database/primitives/status-cell-display";
import { CheckboxCellDisplay } from "src/components/tiptap-node/inline-database/primitives/checkbox-cell-display";
import { MultiSelectCellDisplay } from "src/components/tiptap-node/inline-database/primitives/multi-select-cell-display";
import { DateCellDisplay } from "src/components/tiptap-node/inline-database/primitives/date-cell-display";
import { TextCellDisplay } from "src/components/tiptap-node/inline-database/primitives/text-cell-display";
import { PROPERTY_TYPE_ICONS } from "src/components/tiptap-node/inline-database/types/property-type-meta";
import { getMainEditor } from "src/components/tiptap-templates/simple/hooks/use-record-property-panel";
import { usePages } from "src/components/tiptap-templates/simple/use-pages";
import { findPage } from "src/lib/find-page";
import "./record-property-panel-node-view.scss";
import { Button } from "src/components/tiptap-ui-primitive/button";

function resolveRecord(
  editor: Editor,
  databaseId: string,
  recordId: string,
): { recordNode: Node; attrs: DatabaseAttrs } | null {
  let result: { recordNode: Node; attrs: DatabaseAttrs } | null = null;

  editor.state.doc.descendants((node) => {
    if (result) return false;
    if (node.type.name !== "database" || node.attrs.id !== databaseId) return;
    node.forEach((child) => {
      if (result) return;
      if (child.type.name !== "databaseRecord" || child.attrs.id !== recordId)
        return;
      result = { recordNode: child, attrs: node.attrs as DatabaseAttrs };
    });
    return false;
  });

  return result;
}

function PropertyRow({
  prop,
  cell,
  // attrs,
  databaseId,
  recordId,
  pageId,
  mainEditor,
}: {
  prop: DatabaseProperty;
  cell: Node;
  attrs: DatabaseAttrs;
  databaseId: string;
  recordId: string;
  pageId: number;
  mainEditor: Editor;
}) {
  const { pages, updatePageAsync } = usePages();
  const Icon = PROPERTY_TYPE_ICONS[prop.config.type];
  const value = cell.attrs.value;

  function updateCell(newValue: unknown) {
    // Update the cell in mainEditor doc
    mainEditor.commands.updateDatabaseCell(
      databaseId,
      recordId,
      prop.id,
      newValue,
    );

    // Save the linked page directly — same pattern as TitleCellNodeView
    if (!pages) return;
    const page = findPage(pages, pageId);
    if (!page) return;
    queueMicrotask(() => {
      updatePageAsync({ ...page, updatedAt: Date.now().toString() });
    });
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
      case "text":
        return (
          <TextCellDisplay value={value} onChange={(v) => updateCell(v)} />
        );
      case "number":
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
      <Button variant="ghost" style={{ background: "transparent" }}>
        <Icon size={13} className="tiptap-button-icon" />
        <span className="tiptap-button-text">{prop.name}</span>
      </Button>
      <div className="record-prop-panel__value-wrapper">{rendered}</div>
    </div>
  );
}

export function RecordPropertyPanelView({
  node,
  editor: peekEditor,
}: NodeViewProps) {
  const { pageId, databaseId, recordId } = node.attrs as {
    pageId: number | null;
    databaseId: string | null;
    recordId: string | null;
    parentId: number | null;
  };

  const mainEditor: Editor | null = getMainEditor(peekEditor);

  // Re-render when mainEditor doc changes so cell values stay fresh
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!mainEditor) return;
    const handler = () => setTick((t) => t + 1);
    mainEditor.on("transaction", handler);
    return () => {
      mainEditor.off("transaction", handler);
    };
  }, [mainEditor]);

  if (!mainEditor || pageId === null || !databaseId || !recordId) {
    return <NodeViewWrapper />;
  }

  const resolved = resolveRecord(mainEditor, databaseId, recordId);
  if (!resolved) return <NodeViewWrapper />;

  const { attrs, recordNode } = resolved;

  const cellMap = new Map<string, Node>();
  recordNode.forEach((cell) => cellMap.set(cell.attrs.propertyId, cell));

  const properties = attrs.properties.filter((p) => p.config.type !== "title");
  if (properties.length === 0) return <NodeViewWrapper />;

  return (
    <NodeViewWrapper contentEditable={false}>
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
              databaseId={databaseId}
              recordId={recordId}
              pageId={pageId}
              mainEditor={mainEditor}
            />
          );
        })}
      </div>
    </NodeViewWrapper>
  );
}

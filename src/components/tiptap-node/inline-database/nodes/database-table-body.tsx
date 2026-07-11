// The table view's rendered body: the header row, the node-rendered grid
// (ProseMirror puts databaseRecord > databaseCell here via NodeViewContent),
// the "New" record button, and the calculations footer.

import React from "react";
import { Plus } from "lucide-react";
import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { DatabaseCalculations } from "../components/database-calculations";
import { DatabaseTableHeader } from "./database-table-header";
import type {
  DatabaseProperty,
  DatabaseView,
  PropertyConfig,
  Page,
} from "src/types";

type PropertyType = PropertyConfig["type"];

interface Props {
  tableRef: React.RefObject<HTMLDivElement | null>;
  locked: boolean;
  hovered: boolean;

  visibleProperties: DatabaseProperty[];
  allProperties: DatabaseProperty[];
  activeView: DatabaseView | undefined;
  sortedRecords: Page[];

  gridTemplateColumns: string;
  bodyGridTemplateColumns: string;
  widthFor: (p: DatabaseProperty) => number;

  optionsMenu: React.ReactNode;

  onReorder: (orderedIds: string[]) => void;
  onAddProperty: (type: PropertyType) => void;
  onCommitColumnWidth: (
    ref: { current: HTMLElement | null } | undefined,
    width: number,
  ) => void;
  onNewRecord: () => void;
}

export function DatabaseTableBody({
  tableRef,
  locked,
  hovered,
  visibleProperties,
  allProperties,
  activeView,
  sortedRecords,
  gridTemplateColumns,
  bodyGridTemplateColumns,
  widthFor,
  optionsMenu,
  onReorder,
  onAddProperty,
  onCommitColumnWidth,
  onNewRecord,
}: Props) {
  return (
    <NodeViewWrapper
      as="div"
      ref={tableRef}
      className="db-table"
      data-type="database-table"
      data-locked={locked ? "true" : "false"}
    >
      <DatabaseTableHeader
        visibleProperties={visibleProperties}
        allProperties={allProperties}
        activeView={activeView}
        locked={locked}
        gridTemplateColumns={gridTemplateColumns}
        widthFor={widthFor}
        optionsMenu={optionsMenu}
        onReorder={onReorder}
        onAddProperty={onAddProperty}
        onCommitColumnWidth={onCommitColumnWidth}
      />

      {/* Body — ProseMirror renders databaseRecord > databaseCell here. */}
      <div
        className="db-node-grid"
        style={{
          display: "grid",
          gridTemplateColumns: bodyGridTemplateColumns,
        }}
      >
        <NodeViewContent as="div" className="db-node-grid__body" />
      </div>

      {/* New record */}
      <div
        contentEditable={false}
        style={{
          opacity: hovered ? 1 : 0,
          pointerEvents: hovered ? "auto" : "none",
          transition: "opacity 0.2s ease",
        }}
      >
        <Button
          variant="ghost"
          style={{
            justifyContent: "flex-start",
            borderRadius: "var(--tt-radius-sm)",
            fontSize: 12,
          }}
          onClick={onNewRecord}
        >
          <Plus className="tiptap-button-icon" />
          <span className="tiptap-button-text">New</span>
        </Button>
      </div>

      {/* Calculations footer */}
      <div contentEditable={false}>
        <DatabaseCalculations
          properties={visibleProperties}
          records={sortedRecords}
          gridTemplateColumns={gridTemplateColumns}
        />
      </div>
    </NodeViewWrapper>
  );
}

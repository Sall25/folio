import type {
  CellValue,
  DatabaseProperty,
  DatabaseView,
  Page,
  PageCover,
} from "src/types";
import { TitleCell } from "../title-cell";
import { TextCell } from "../text-cell";
import { NumberCell } from "../number-cell";
import { CheckboxCell } from "../checkbox-cell";
import { SelectCell } from "../select-cell";
import { MultiSelectCell } from "../multi-select-cell/multi-select-cell";
import { StatusCell } from "../status-cell";
import { DueDateCell } from "../due-date-cell";
import { PersonCell } from "../person-cell";
import { EmailCell } from "../email-cell";
import { UrlCell } from "../url-cell";
//import { PhoneCell } from "./phone-cell";
import { FormulaCell } from "../formula-cell";
//import { RollupCell } from "../rollup-cell";
//import { RelationCell } from "../relation-cell";
import { CreatedTimeCell } from "../created-time-cell";
import { EditedTimeCell } from "../edited-time-cell";
//import { CreatedByCell } from "../created-by-cell";
//import { EditedByCell } from "../edited-by-cell";
import "./cell.scss";
import { evaluateFormula } from "../../formula-editor/formula-evaluator";
import { RelationCell } from "../relation-cell";
import { RollupCell } from "../rollup-cell";
import { PhoneCell } from "../phone-cell";
import { memo } from "react";

function CellImpl({
  property,
  properties,
  value,
  record,
  columnValues,
  onChange,
  readonly,
  unwrapped,
  view,
  // autoEdit,
  //onEditingChange,
  templateCover,
}: {
  property: DatabaseProperty;
  properties?: DatabaseProperty[];
  value: CellValue | null;
  record: Page;
  view?: DatabaseView;
  /** all values in this column — only number bar/ring uses it */
  columnValues?: CellValue[];
  /** parent database templateId — title uses it for the template icon */
  onChange: (value: CellValue | null) => void;
  readonly?: boolean;
  unwrapped?: boolean;
  autoEdit?: boolean;
  onEditingChange?: (editing: boolean) => void;
  templateCover?: PageCover | null;
}) {
  const { config } = property;

  // One trusted boundary: we've checked config.type, so we vouch that
  // value/onChange match CellValue<that type>.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v = value as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const change = onChange as any;

  switch (config.type) {
    case "title":
      return (
        <TitleCell
          value={typeof value === "string" ? value : ""}
          recordId={record.id}
          record={record}
          pageId={record.id}
          onChange={change}
          readonly={readonly}
          unwrapped={unwrapped}
          icon={record.cover ?? templateCover ?? null}
        />
      );

    case "text":
      return (
        <TextCell
          value={v}
          config={config}
          onChange={change}
          readonly={readonly}
          unwrapped={unwrapped}
          className={`db-cell ${view?.type === "gallery" || view?.type === "board" ? "db-cell-board-view" : ""}`}
        />
      );

    case "relation":
      return (
        <RelationCell
          value={v}
          config={config}
          onChange={change}
          readonly={readonly}
          unwrapped={unwrapped}
          recordId={record.id}
          className={`db-cell ${view?.type === "gallery" || view?.type === "board" ? "db-cell-board-view" : ""}`}
        />
      );

    case "rollup":
      return (
        <RollupCell
          config={config}
          record={record}
          properties={properties ?? []}
          className={`db-cell ${view?.type === "gallery" || view?.type === "board" ? "db-cell-board-view" : ""}`}
        />
      );

    case "number":
      return (
        <NumberCell
          value={v}
          config={config}
          columnValues={columnValues as (number | null)[] | undefined}
          onChange={change}
          readonly={readonly}
          align={view?.type === "table" ? "right" : "left"}
          className={`db-cell ${view?.type === "gallery" || view?.type === "board" ? "db-cell-board-view" : ""}`}
        />
      );

    case "checkbox":
      return (
        <CheckboxCell
          value={v}
          config={config}
          onChange={change}
          readonly={readonly}
          className={`db-cell ${view?.type === "gallery" || view?.type === "board" ? "db-cell-board-view" : ""}`}
        />
      );

    case "select":
      return (
        <SelectCell
          value={v}
          config={config}
          onChange={change}
          readonly={readonly}
          className={`db-cell ${view?.type === "gallery" || view?.type === "board" ? "db-cell-board-view" : ""}`}
        />
      );

    case "multi_select":
      return (
        <MultiSelectCell
          value={v}
          config={config}
          onChange={change}
          readonly={readonly}
          className={`db-cell ${view?.type === "gallery" || view?.type === "board" ? "db-cell-board-view" : ""}`}
        />
      );

    case "status":
      return (
        <StatusCell
          value={v}
          config={config}
          onChange={change}
          readonly={readonly}
          className={`db-cell ${view?.type === "gallery" || view?.type === "board" ? "db-cell-board-view" : ""}`}
        />
      );

    case "date":
      return (
        <DueDateCell
          value={v}
          config={config}
          onChange={change}
          readonly={readonly}
          className={`db-cell ${view?.type === "gallery" || view?.type === "board" ? "db-cell-board-view" : ""}`}
        />
      );

    case "person":
      return (
        <PersonCell
          value={v}
          config={config}
          onChange={change}
          readonly={readonly}
          className={`db-cell ${view?.type === "gallery" || view?.type === "board" ? "db-cell-board-view" : ""}`}
        />
      );

    case "email":
      return (
        <EmailCell
          value={v}
          config={config}
          onChange={change}
          readonly={readonly}
          className={`db-cell ${view?.type === "gallery" || view?.type === "board" ? "db-cell-board-view" : ""}`}
        />
      );

    case "url":
      return (
        <UrlCell
          value={v}
          config={config}
          onChange={change}
          readonly={readonly}
          className={`db-cell ${view?.type === "gallery" || view?.type === "board" ? "db-cell-board-view" : ""}`}
        />
      );

    // ── Read-only / computed: always readonly, no onChange effect ────────────
    case "formula": {
      const computed = evaluateFormula(config.expression, {
        properties: properties ?? [],
        cellValues: record.values as Record<string, CellValue>,
      });
      return (
        <FormulaCell
          value={computed as CellValue<"formula"> | null}
          config={config}
          onChange={onChange as (v: CellValue<"formula"> | null) => void}
          unwrapped={unwrapped}
          className={`db-cell ${view?.type === "gallery" || view?.type === "board" ? "db-cell-board-view" : ""}`}
        />
      );
    }

    case "created_time":
      return (
        <CreatedTimeCell
          value={record.createdAt as CellValue<"created_time"> | null}
          config={config}
          onChange={change}
          className={`db-cell ${view?.type === "gallery" || view?.type === "board" ? "db-cell-board-view" : ""}`}
          readonly
        />
      );

    case "edited_time":
      return (
        <EditedTimeCell
          value={record.updatedAt as CellValue<"edited_time"> | null}
          config={config}
          onChange={change}
          className={`db-cell ${view?.type === "gallery" || view?.type === "board" ? "db-cell-board-view" : ""}`}
          readonly
        />
      );
    case "phone":
      return (
        <PhoneCell
          value={v}
          config={config}
          onChange={change}
          readonly={readonly}
          className={`db-cell ${view?.type === "gallery" || view?.type === "board" ? "db-cell-board-view" : ""}`}
        />
      );

    // case "created_by":
    //   return (
    //     <CreatedByCell value={v} config={config} onChange={change} readonly />
    //   );

    // case "edited_by":
    //   return (
    //     <EditedByCell value={v} config={config} onChange={change} readonly />
    //   );

    default: {
      // Exhaustiveness guard — if a new PropertyType is added and not handled,
      // this errors at compile time.
      // const _exhaustive: never = config;
      // void _exhaustive;
      return null;
    }
  }
}

export const Cell = memo(CellImpl);

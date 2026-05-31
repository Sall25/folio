import type { CellValue, DatabaseProperty, ID } from "../../../types/types";
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

export interface CellRecord {
  id: ID;
  pageId?: number;
  values: Record<ID, unknown>;
}

export function Cell({
  property,
  value,
  record,
  columnValues,
  templateId,
  onChange,
  readonly,
}: {
  property: DatabaseProperty;
  value: CellValue | null;
  record: CellRecord;
  /** all values in this column — only number bar/ring uses it */
  columnValues?: CellValue[];
  /** parent database templateId — title uses it for the template icon */
  templateId?: number;
  onChange: (value: CellValue | null) => void;
  readonly?: boolean;
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
          pageId={record.pageId}
          templateId={templateId}
          onChange={change}
          readonly={readonly}
        />
      );

    case "text":
      return (
        <TextCell
          value={v}
          config={config}
          onChange={change}
          readonly={readonly}
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
        />
      );

    case "checkbox":
      return (
        <CheckboxCell
          value={v}
          config={config}
          onChange={change}
          readonly={readonly}
        />
      );

    case "select":
      return (
        <SelectCell
          value={v}
          config={config}
          onChange={change}
          readonly={readonly}
        />
      );

    case "multi_select":
      return (
        <MultiSelectCell
          value={v}
          config={config}
          onChange={change}
          readonly={readonly}
        />
      );

    case "status":
      return (
        <StatusCell
          value={v}
          config={config}
          onChange={change}
          readonly={readonly}
        />
      );

    case "date":
      return (
        <DueDateCell
          value={v}
          config={config}
          onChange={change}
          readonly={readonly}
        />
      );

    case "person":
      return (
        <PersonCell
          value={v}
          config={config}
          onChange={change}
          readonly={readonly}
        />
      );

    case "email":
      return (
        <EmailCell
          value={v}
          config={config}
          onChange={change}
          readonly={readonly}
        />
      );

    case "url":
      return (
        <UrlCell
          value={v}
          config={config}
          onChange={change}
          readonly={readonly}
        />
      );

    // case "phone":
    //   return (
    //     <PhoneCell
    //       value={v}
    //       config={config}
    //       onChange={change}
    //       readonly={readonly}
    //     />
    //   );

    // case "relation":
    //   return (
    //     <RelationCell
    //       value={v}
    //       config={config}
    //       onChange={change}
    //       readonly={readonly}
    //     />
    //   );

    // ── Read-only / computed: always readonly, no onChange effect ────────────
    case "formula":
      return (
        <FormulaCell value={v} config={config} onChange={change} readonly />
      );

    // case "rollup":
    //   return (
    //     <RollupCell value={v} config={config} onChange={change} readonly />
    //   );

    case "created_time":
      return (
        <CreatedTimeCell value={v} config={config} onChange={change} readonly />
      );

    case "edited_time":
      return (
        <EditedTimeCell value={v} config={config} onChange={change} readonly />
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

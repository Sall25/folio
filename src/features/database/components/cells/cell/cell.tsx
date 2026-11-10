import type {
  CellValue,
  ConfigOf,
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
import { CreatedByCell, EditedByCell } from "../created-by-cell";
import "./cell.scss";
import { evaluateFormula } from "../../formula-editor/formula-evaluator";
import { RelationCell } from "../relation-cell";
import { RollupCell } from "../rollup-cell";
import { PhoneCell } from "../phone-cell";
import { UniqueIdCell } from "../unique-id-cell";
import { FilesCell } from "../files-cell";
import { memo } from "react";
import { useWorkspacePeople } from "../../../hooks/use-workspace-people";
import { useFormulaEngineReady } from "../../formula-editor/formula-engine";

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
  autoEdit,
  onEditingChange,
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
          config={config}
          view={view}
          autoEdit={autoEdit}
          onEditingChange={onEditingChange}
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
          record={record}
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
    case "formula":
      return (
        <ComputedFormulaCell
          config={config}
          properties={properties ?? []}
          record={record}
          onChange={onChange as (v: CellValue<"formula"> | null) => void}
          unwrapped={unwrapped}
          className={`db-cell ${view?.type === "gallery" || view?.type === "board" ? "db-cell-board-view" : ""}`}
        />
      );

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
    case "files":
      return (
        <FilesCell
          value={v}
          config={config}
          onChange={change}
          readonly={readonly}
          unwrapped={unwrapped}
          className={`db-cell ${view?.type === "gallery" || view?.type === "board" ? "db-cell-board-view" : ""}`}
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

    case "created_by":
      return (
        <CreatedByCell
          ownerId={record.ownerId}
          unwrapped={unwrapped}
          className={`db-cell ${view?.type === "gallery" || view?.type === "board" ? "db-cell-board-view" : ""}`}
        />
      );

    case "edited_by":
      return (
        <EditedByCell
          editedBy={record.editedBy}
          ownerId={record.ownerId}
          unwrapped={unwrapped}
          className={`db-cell ${view?.type === "gallery" || view?.type === "board" ? "db-cell-board-view" : ""}`}
        />
      );

    case "unique_id":
      return (
        <UniqueIdCell
          value={v}
          config={config}
          onChange={change}
          unwrapped={unwrapped}
          className={`db-cell ${view?.type === "gallery" || view?.type === "board" ? "db-cell-board-view" : ""}`}
          readonly
        />
      );

    default: {
      // Exhaustiveness guard — if a new PropertyType is added and not handled,
      // this errors at compile time.
      // const _exhaustive: never = config;
      // void _exhaustive;
      return null;
    }
  }
}

// A formula cell: evaluated against the row's values (rollups and mirror
// links included when the row comes from the resolved pipeline), with
// people's names for Created by / Edited by. Its own component so the
// people hook isn't called inside CellImpl's switch.
function ComputedFormulaCell({
  config,
  properties,
  record,
  onChange,
  unwrapped,
  className,
}: {
  config: ConfigOf<"formula">;
  properties: DatabaseProperty[];
  record: Page;
  onChange: (v: CellValue<"formula"> | null) => void;
  unwrapped?: boolean;
  className: string;
}) {
  const people = useWorkspacePeople();
  // Re-render once mathjs has loaded (evaluateFormula is null until then).
  useFormulaEngineReady();
  const computed = evaluateFormula(config.expression, {
    properties,
    cellValues: record.values as Record<string, CellValue>,
    page: record,
    personName: (id) => people.find((p) => p.id === id)?.name,
  });
  return (
    <FormulaCell
      value={computed as CellValue<"formula"> | null}
      config={config}
      onChange={onChange}
      unwrapped={unwrapped}
      className={className}
    />
  );
}

export const Cell = memo(CellImpl);

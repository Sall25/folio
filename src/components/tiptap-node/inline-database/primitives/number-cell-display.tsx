import { useState } from "react";
import type { NumberFormat, DecimalPlaces, NumberShowAs } from "src/types";
import { Input } from "src/components/tiptap-ui-primitive/input";
import { CellEditorPopover } from "./cell-editor-popover";
import "./number-cell-display.scss";

function formatNumber(
  value: number | null,
  format: NumberFormat,
  prefix?: string,
  suffix?: string,
  decimalPlaces?: DecimalPlaces,
): string {
  if (value === null || value === undefined) return "";
  const v =
    decimalPlaces !== undefined && decimalPlaces !== "default"
      ? Number(value.toFixed(decimalPlaces))
      : value;

  let f: string;
  switch (format) {
    case "number_with_commas":
      f = v.toLocaleString();
      break;
    case "percent":
      f = `${v}%`;
      break;
    case "dollar":
      f = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(v);
      break;
    case "euro":
      f = new Intl.NumberFormat("en-EU", {
        style: "currency",
        currency: "EUR",
      }).format(v);
      break;
    case "pound":
      f = new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
      }).format(v);
      break;
    case "yen":
      f = new Intl.NumberFormat("ja-JP", {
        style: "currency",
        currency: "JPY",
      }).format(v);
      break;
    case "ruble":
      f = new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: "RUB",
      }).format(v);
      break;
    case "rupee":
      f = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
      }).format(v);
      break;
    case "won":
      f = new Intl.NumberFormat("ko-KR", {
        style: "currency",
        currency: "KRW",
      }).format(v);
      break;
    case "yuan":
      f = new Intl.NumberFormat("zh-CN", {
        style: "currency",
        currency: "CNY",
      }).format(v);
      break;
    default:
      f = String(v);
  }
  if (prefix) f = `${prefix}${f}`;
  if (suffix) f = `${f}${suffix}`;
  return f;
}

export interface NumberCellDisplayProps {
  value: number | null;
  onChange: (value: number | null) => void;
  format?: NumberFormat;
  prefix?: string;
  suffix?: string;
  decimalPlaces?: DecimalPlaces;
  showAs?: NumberShowAs;
  /** column max, for bar/ring fill — caller computes it */
  max?: number;
  readonly?: boolean;
  align?: "left" | "right";
}

/**
 * Number cell. Uses the shared CellEditorPopover so it edits exactly like title
 * and text: click the cell → a bordered box opens OVER it (escaping the column's
 * overflow) → blur or Enter commits, Escape cancels.
 *
 * It used to own a bespoke Popover that dropped BELOW the cell and needed an
 * explicit submit button, which made it the odd one out.
 */
export function NumberCellDisplay({
  value = 0,
  onChange,
  format = "number",
  prefix,
  suffix,
  decimalPlaces,
  showAs = "number",
  max = 0,
  readonly,
  align = "right",
}: NumberCellDisplayProps) {
  const [draft, setDraft] = useState(value !== null ? String(value) : "");

  // Adopt external changes while idle — same pattern as the title/text cells.
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    setDraft(value !== null ? String(value) : "");
  }

  const display = formatNumber(value, format, prefix, suffix, decimalPlaces);

  const fraction =
    max > 0 && value !== null ? Math.min(Math.max(value / max, 0), 1) : 0;

  const hasValue = value !== null;

  const commit = (close: () => void) => {
    const trimmed = draft.trim();
    const parsed = trimmed === "" ? null : Number(trimmed);
    // Reject garbage rather than writing NaN into the record.
    if (trimmed !== "" && Number.isNaN(parsed)) {
      setDraft(value !== null ? String(value) : "");
      close();
      return;
    }
    if (parsed !== value) onChange(parsed);
    close();
  };

  const content =
    showAs === "bar" && hasValue ? (
      <span className="num-cell__bar-wrap">
        <span className="num-cell__num">{display}</span>
        <span className="num-cell__bar-track">
          <span
            className="num-cell__bar-fill"
            style={{ width: `${fraction * 100}%` }}
          />
        </span>
      </span>
    ) : showAs === "ring" && hasValue ? (
      <span className="num-cell__ring-wrap">
        <span className="num-cell__num">{display}</span>
        <span
          className="num-cell__ring"
          style={{ ["--ring-deg" as string]: `${fraction * 360}deg` }}
        />
      </span>
    ) : (
      <span className={`num-cell__display`}>{display}</span>
    );

  const alignClass = showAs === "number" ? "" : " num-cell--right";

  if (readonly) return <div className={`num-cell${alignClass}`}>{content}</div>;

  return (
    <CellEditorPopover
      width="calc(var(--radix-popover-trigger-width) + 8px)"
      minHeight="calc(var(--radix-popover-trigger-height) + 4px)"
      trigger={
        <div
          className={`num-cell${alignClass}`}
          style={{
            justifyContent: align === "left" ? "flex-start" : "flex-end",
          }}
        >
          {content}
        </div>
      }
    >
      {(close) => (
        <Input
          type="number"
          // Focus with the caret at the end rather than position 0 — autoFocus
          // alone leaves caret placement up to the browser.
          ref={(el) => {
            if (!el) return;
            el.focus();
            const end = el.value.length;
            // A number input rejects setSelectionRange in some browsers, so
            // this is best-effort: focus still lands correctly either way.
            try {
              el.setSelectionRange(end, end);
            } catch {
              /* type=number disallows selection APIs in Firefox */
            }
          }}
          className="num-cell__input"
          placeholder="0"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commit(close)}
          // onKeyDown={(e) => {
          //   if (e.key === "Enter") {
          //     e.preventDefault();
          //     commit(close);
          //   }
          //   if (e.key === "Escape") {
          //     e.preventDefault();
          //     setDraft(value !== null ? String(value) : "");
          //     close();
          //   }
          // }}
          style={{
            justifyContent: align === "left" ? "flex-start" : "flex-end",
            textAlign: "right",
          }}
        />
      )}
    </CellEditorPopover>
  );
}

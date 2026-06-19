import { ArrowUp } from "lucide-react";
import { useState } from "react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import type { NumberFormat, DecimalPlaces, NumberShowAs } from "src/types";
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
}

export function NumberCellDisplay({
  value,
  onChange,
  format = "number",
  prefix,
  suffix,
  decimalPlaces,
  showAs = "number",
  max = 0,
  readonly,
}: NumberCellDisplayProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState(value !== null ? String(value) : "");

  const display = formatNumber(value, format, prefix, suffix, decimalPlaces);

  const fraction =
    max > 0 && value !== null ? Math.min(Math.max(value / max, 0), 1) : 0;

  function save() {
    const parsed = input === "" ? null : Number(input);
    if (input !== "" && isNaN(parsed!)) return;
    onChange(parsed);
    setOpen(false);
  }

  const hasValue = value !== null;

  const content =
    showAs === "bar" && hasValue ? (
      <span className="num-cell__bar-wrap">
        <span className="num-cell__bar-track">
          <span
            className="num-cell__bar-fill"
            style={{ width: `${fraction * 100}%` }}
          />
        </span>
        <span className="num-cell__num">{display}</span>
      </span>
    ) : showAs === "ring" && hasValue ? (
      <span className="num-cell__ring-wrap">
        <span
          className="num-cell__ring"
          style={{ ["--ring-deg" as string]: `${fraction * 360}deg` }}
        />
        <span className="num-cell__num">{display}</span>
      </span>
    ) : (
      <span className="num-cell__display">{display}</span>
    );

  if (readonly) return <div className="num-cell">{content}</div>;

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) setInput(value !== null ? String(value) : "");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          style={{
            background: "transparent",
            width: "100%",
            justifyContent: showAs === "number" ? "flex-start" : "flex-end",
          }}
        >
          {content}
        </Button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start">
        <Card style={{ padding: "5px 10px" }}>
          <CardItemGroup orientation="horizontal">
            <input
              type="number"
              className="num-cell__input"
              placeholder="0"
              value={input}
              autoFocus
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") setOpen(false);
              }}
            />
            <Spacer />
            <Button
              variant="ghost"
              style={{
                background: "var(--tt-brand-color-400)",
                borderRadius: "var(--tt-radius-xl)",
              }}
              onClick={save}
            >
              <ArrowUp
                className="tiptap-button-icon"
                style={{ color: "white" }}
              />
            </Button>
          </CardItemGroup>
        </Card>
      </PopoverContent>
    </Popover>
  );
}

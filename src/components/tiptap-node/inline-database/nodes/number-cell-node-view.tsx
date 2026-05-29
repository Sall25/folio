import type { NodeViewProps } from "@tiptap/core";
import { NodeViewWrapper } from "@tiptap/react";
import { ArrowUp } from "lucide-react";
import { useState, useCallback } from "react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import type {
  NumberCellAttrs,
  NumberFormat,
  DatabaseAttrs,
} from "../types/types";
import "./number-cell-node-view.scss";
import { useCellPageSync } from "../hooks/use-cell-page-sync";
import { useIsPropertyHidden } from "../hooks/use-is-property-hidden";
import { useActiveViewType } from "../hooks/use-active-view-type";

function formatNumber(
  value: number | null,
  format: NumberFormat,
  prefix?: string,
  suffix?: string,
  decimalPlaces?: "default" | number,
): string {
  if (value === null || value === undefined) return "";

  const v =
    decimalPlaces !== undefined && decimalPlaces !== "default"
      ? Number(value.toFixed(decimalPlaces))
      : value;

  let formatted: string;
  switch (format) {
    case "number_with_commas":
      formatted = v.toLocaleString();
      break;
    case "percent":
      formatted = `${v}%`;
      break;
    case "dollar":
      formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(v);
      break;
    case "euro":
      formatted = new Intl.NumberFormat("en-EU", {
        style: "currency",
        currency: "EUR",
      }).format(v);
      break;
    case "pound":
      formatted = new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
      }).format(v);
      break;
    case "yen":
      formatted = new Intl.NumberFormat("ja-JP", {
        style: "currency",
        currency: "JPY",
      }).format(v);
      break;
    case "ruble":
      formatted = new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: "RUB",
      }).format(v);
      break;
    case "rupee":
      formatted = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
      }).format(v);
      break;
    case "won":
      formatted = new Intl.NumberFormat("ko-KR", {
        style: "currency",
        currency: "KRW",
      }).format(v);
      break;
    case "yuan":
      formatted = new Intl.NumberFormat("zh-CN", {
        style: "currency",
        currency: "CNY",
      }).format(v);
      break;
    default:
      formatted = String(v);
  }

  if (prefix) formatted = `${prefix}${formatted}`;
  if (suffix) formatted = `${formatted}${suffix}`;
  return formatted;
}

export function NumberCellNodeView({
  node,
  editor,
  getPos,
  updateAttributes,
}: NodeViewProps) {
  const attrs = node.attrs as NumberCellAttrs;
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState<string>(
    attrs.value !== null && attrs.value !== undefined
      ? String(attrs.value)
      : "",
  );
  const activeViewType = useActiveViewType(editor, getPos);

  const getParentDatabase = useCallback(() => {
    const pos = getPos?.();
    if (pos == null) return null;
    const $pos = editor.state.doc.resolve(pos);
    for (let d = $pos.depth; d > 0; d--) {
      const n = $pos.node(d);
      if (n.type.name === "database") return n;
    }
    return null;
  }, [editor, getPos]);

  const db = getParentDatabase();
  const dbAttrs = db?.attrs as DatabaseAttrs | undefined;
  const prop = dbAttrs?.properties.find((p) => p.id === attrs.propertyId);
  const config = prop?.config.type === "number" ? prop.config : null;
  const syncPage = useCellPageSync(getPos, updateAttributes);
  const isHidden = useIsPropertyHidden(editor, getPos, node.attrs.propertyId);

  const showAs = config?.showAs ?? "number";

  // Max across the column — needed for bar/ring fill. Computed from siblings.
  let columnMax = 0;
  if (db && (showAs === "bar" || showAs === "ring")) {
    db.forEach((record) => {
      if (record.type.name !== "databaseRecord") return;
      record.forEach((cell) => {
        if (cell.attrs.propertyId !== attrs.propertyId) return;
        const v = cell.attrs.value;
        if (typeof v === "number" && v > columnMax) columnMax = v;
      });
    });
  }

  const value = attrs.value ?? 0;
  const fraction =
    columnMax > 0 ? Math.min(Math.max(value / columnMax, 0), 1) : 0;

  const displayValue = formatNumber(
    attrs.value,
    config?.format ?? "number",
    config?.prefix,
    config?.suffix,
    config?.decimalPlaces,
  );

  function handleSave() {
    const parsed = inputValue === "" ? null : Number(inputValue);
    if (inputValue !== "" && isNaN(parsed!)) return;
    updateAttributes({ value: parsed });
    setOpen(false);
  }

  if (isHidden)
    return <NodeViewWrapper as={"div"} style={{ display: "none" }} />;

  const hasValue = attrs.value !== null && attrs.value !== undefined;

  const triggerContent =
    showAs === "bar" && hasValue ? (
      <span className="db-cell-number__bar-wrap">
        <span className="db-cell-number__bar-track">
          <span
            className="db-cell-number__bar-fill"
            style={{ width: `${fraction * 100}%` }}
          />
        </span>
        <span className="db-cell-number__bar-num">{displayValue}</span>
      </span>
    ) : showAs === "ring" && hasValue ? (
      <span className="db-cell-number__ring-wrap">
        <span
          className="db-cell-number__ring"
          style={
            {
              "--ring-deg": `${fraction * 360}deg`,
            } as React.CSSProperties
          }
        />
        <span className="db-cell-number__ring-num">{displayValue}</span>
      </span>
    ) : (
      <span className="db-cell-number__display">{displayValue}</span>
    );

  return (
    <NodeViewWrapper
      as="div"
      data-type="number-cell"
      className={`${activeViewType === "table" ? "db-td" : ""} db-td--number`}
      style={{ margin: 0 }}
    >
      <Popover
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (v)
            setInputValue(
              attrs.value !== null && attrs.value !== undefined
                ? String(attrs.value)
                : "",
            );
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
            {triggerContent}
          </Button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="start">
          <Card style={{ padding: "5px 10px" }}>
            <CardItemGroup orientation="horizontal">
              <input
                type="number"
                className="db-cell-number__input"
                placeholder="0"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") syncPage(() => handleSave(), node);
                  if (e.key === "Escape") setOpen(false);
                }}
                autoFocus
              />
              <Spacer />
              <Button
                variant="ghost"
                style={{
                  background: "var(--tt-brand-color-400)",
                  borderRadius: "var(--tt-radius-xl)",
                }}
                onClick={handleSave}
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
    </NodeViewWrapper>
  );
}

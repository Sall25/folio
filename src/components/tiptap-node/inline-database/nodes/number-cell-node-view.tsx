import type { NodeViewProps } from "@tiptap/core";
import { NodeViewWrapper } from "@tiptap/react";
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
import type { NumberCellAttrs } from "../types/types";
import type { NumberFormat } from "../types/types";
import { useCallback } from "react";
import type { DatabaseAttrs } from "../types/types";
import "./number-cell-node-view.scss";
import { useCellPageSync } from "../hooks/use-cell-page-sync";
import { useIsPropertyHidden } from "../hooks/use-is-property-hidden";
import { useActiveViewType } from "../hooks/use-active-view-type";

function formatNumber(
  value: number | null,
  format: NumberFormat,
  prefix?: string,
  suffix?: string,
): string {
  if (value === null || value === undefined) return "";

  let formatted: string;

  switch (format) {
    case "number_with_commas":
      formatted = value.toLocaleString();
      break;
    case "percent":
      formatted = `${value}%`;
      break;
    case "dollar":
      formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(value);
      break;
    case "euro":
      formatted = new Intl.NumberFormat("en-EU", {
        style: "currency",
        currency: "EUR",
      }).format(value);
      break;
    case "pound":
      formatted = new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
      }).format(value);
      break;
    case "yen":
      formatted = new Intl.NumberFormat("ja-JP", {
        style: "currency",
        currency: "JPY",
      }).format(value);
      break;
    case "ruble":
      formatted = new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: "RUB",
      }).format(value);
      break;
    case "rupee":
      formatted = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
      }).format(value);
      break;
    case "won":
      formatted = new Intl.NumberFormat("ko-KR", {
        style: "currency",
        currency: "KRW",
      }).format(value);
      break;
    case "yuan":
      formatted = new Intl.NumberFormat("zh-CN", {
        style: "currency",
        currency: "CNY",
      }).format(value);
      break;
    default:
      formatted = String(value);
      break;
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

  const displayValue = formatNumber(
    attrs.value,
    config?.format ?? "number",
    config?.prefix,
    config?.suffix,
  );

  function handleSave() {
    const parsed = inputValue === "" ? null : Number(inputValue);
    if (inputValue !== "" && isNaN(parsed!)) return;
    updateAttributes({ value: parsed });
    setOpen(false);
  }

  if (isHidden)
    return <NodeViewWrapper as={"div"} style={{ display: "none" }} />;

  return (
    <NodeViewWrapper
      as="div"
      data-type="number-cell"
      // className="db-td db-td--number"
      className={`${activeViewType === "table" ? "db-td" : ""} multi-select-cell`}
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
              justifyContent: "flex-start",
            }}
          >
            <span className="db-cell-number__display">{displayValue}</span>
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

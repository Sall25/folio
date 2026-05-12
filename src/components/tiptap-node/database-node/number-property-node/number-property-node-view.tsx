import { useState, useCallback, useRef } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import type { NumberFormat } from "./number-property-node";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";

import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Card,
  CardBody,
  CardHeader,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import "./number-property-node-view.scss";

const FORMATS: {
  id: NumberFormat;
  name: string;
  preview: string;
  formatter: (n: number) => string;
}[] = [
  {
    id: "number",
    name: "Number",
    preview: "1,000",
    formatter: (n) => new Intl.NumberFormat().format(n),
  },
  {
    id: "dollar",
    name: "Dollar",
    preview: "$1,000",
    formatter: (n) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(n),
  },
  {
    id: "euro",
    name: "Euro",
    preview: "€1,000",
    formatter: (n) =>
      new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(n),
  },
  {
    id: "pound",
    name: "Pound",
    preview: "£1,000",
    formatter: (n) =>
      new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(n),
  },
  {
    id: "percent",
    name: "Percent",
    preview: "100%",
    formatter: (n) =>
      new Intl.NumberFormat("en-US", {
        style: "percent",
        maximumFractionDigits: 1,
      }).format(n / 100),
  },
  {
    id: "decimal",
    name: "2 decimals",
    preview: "1,000.00",
    formatter: (n) =>
      new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n),
  },
  {
    id: "compact",
    name: "Compact",
    preview: "1K",
    formatter: (n) =>
      new Intl.NumberFormat("en-US", { notation: "compact" }).format(n),
  },
];

const FORMAT_SEPARATORS_BEFORE = new Set<NumberFormat>(["percent", "decimal"]);

function formatValue(value: number, format: NumberFormat): string {
  const fmt = FORMATS.find((f) => f.id === format) ?? FORMATS[0];
  return fmt.formatter(value);
}

const HashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <text x="1" y="11" fontSize="11" fontWeight="600" fill="currentColor">
      #
    </text>
  </svg>
);

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path
      d="M2 6l3 3 5-5"
      stroke="var(--tt-brand-color-500)"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
);

export function NumberPropertyNodeView({
  node,
  updateAttributes,
}: NodeViewProps) {
  const { value, format, nodeId } = node.attrs as {
    value: number | null;
    format: NumberFormat;
    nodeId: string;
  };

  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        setDraft(value !== null ? String(value) : "");
        requestAnimationFrame(() => {
          inputRef.current?.focus();
          inputRef.current?.select();
        });
      }
    },
    [value],
  );

  const commit = useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed === "") {
      updateAttributes({ value: null });
      return;
    }
    const parsed = parseFloat(trimmed);
    if (!isNaN(parsed)) {
      updateAttributes({ value: parsed });
    }
  }, [draft, updateAttributes]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commit();
      }
    },
    [commit],
  );

  const displayValue = value !== null ? formatValue(value, format) : null;

  return (
    <NodeViewWrapper
      as="span"
      style={{ display: "inline-flex", position: "relative" }}
      data-node-id={nodeId}
    >
      <Popover onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className={`num-prop__trigger ${displayValue === null ? "num-prop__trigger--empty" : ""}`}
          >
            <HashIcon />
            <span>{displayValue ?? "Empty"}</span>
          </Button>
        </PopoverTrigger>

        <PopoverContent side="right" align="center">
          <Card style={{ width: 200, padding: "3px 0" }}>
            {/* number input */}
            <CardHeader style={{ padding: "6px 10px", gap: 6 }}>
              <HashIcon />
              <input
                ref={inputRef}
                className="num-prop__input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={commit}
                placeholder="Enter a number..."
                type="number"
              />
            </CardHeader>

            {/* format picker */}
            <CardBody style={{ padding: "4px 6px" }}>
              <span className="num-prop__section">Format</span>
              <CardItemGroup orientation="vertical" style={{ gap: 1 }}>
                {FORMATS.map((fmt) => (
                  <div key={fmt.id}>
                    {FORMAT_SEPARATORS_BEFORE.has(fmt.id) && (
                      <Separator
                        orientation="horizontal"
                        style={{ margin: "3px 0" }}
                      />
                    )}
                    <Button
                      variant="ghost"
                      className="num-prop__fmt-option"
                      onClick={() => updateAttributes({ format: fmt.id })}
                    >
                      <span className="num-prop__fmt-left">
                        <span className="num-prop__fmt-preview">
                          {fmt.preview}
                        </span>
                        <span className="num-prop__fmt-name">{fmt.name}</span>
                      </span>
                      <span className="num-prop__fmt-check">
                        {format === fmt.id && <CheckIcon />}
                      </span>
                    </Button>
                  </div>
                ))}
              </CardItemGroup>
            </CardBody>
          </Card>
        </PopoverContent>
      </Popover>
    </NodeViewWrapper>
  );
}

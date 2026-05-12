import { useState, useCallback, useRef, useEffect } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { ArrowUp } from "lucide-react";
import "./checkbox-property-node-view.scss";

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path
        d="M1.5 5l2.5 2.5 5-5"
        stroke="white"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CheckboxPropertyNodeView({
  node,
  updateAttributes,
}: NodeViewProps) {
  const { checked, label, nodeId } = node.attrs as {
    checked: boolean;
    label: string;
    nodeId: string;
  };

  const [hovered, setHovered] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const toggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      updateAttributes({ checked: !checked });
    },
    [checked, updateAttributes],
  );

  const handleOpenChange = useCallback(
    (val: boolean) => {
      if (val) {
        setDraft(label ?? "");
        requestAnimationFrame(() => {
          inputRef.current?.focus();
          inputRef.current?.select();
        });
      }
      setOpen(val);
    },
    [label],
  );

  const commit = useCallback(() => {
    const trimmed = draft.trim();
    updateAttributes({ label: trimmed });
    setOpen(false);
  }, [draft, updateAttributes]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commit();
      }
      if (e.key === "Escape") setOpen(false);
    },
    [commit],
  );

  return (
    <NodeViewWrapper
      as="span"
      style={{ display: "inline-flex", position: "relative" }}
      data-node-id={nodeId}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className="cb-prop">
        {/* ── checkbox ── */}
        <span
          className={[
            "cb-prop__box",
            checked ? "cb-prop__box--checked" : "",
            hovered && !checked ? "cb-prop__box--hover" : "",
          ].join(" ")}
          onClick={toggle}
          role="checkbox"
          aria-checked={checked}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              updateAttributes({ checked: !checked });
            }
          }}
        >
          {checked && <CheckIcon />}
        </span>

        {/* ── label — click to rename ── */}
        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <span
              className={[
                "cb-prop__label",
                checked ? "cb-prop__label--done" : "",
                !label ? "cb-prop__label--empty" : "",
              ].join(" ")}
            >
              {label || "Unchecked"}
            </span>
          </PopoverTrigger>

          <PopoverContent side="bottom" align="start">
            <Card className="cb-prop__popover">
              <CardItemGroup orientation="horizontal" style={{ width: "100%" }}>
                <input
                  ref={inputRef}
                  className="cb-prop__popover-input"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Label..."
                />
                <Button
                  style={{
                    background: "var(--tt-brand-color-400)",
                    color: "white",
                    borderRadius: "var(--tt-radius-xl)",
                  }}
                  onClick={commit}
                >
                  <ArrowUp className="tiptap-button-icon" />
                </Button>
              </CardItemGroup>
            </Card>
          </PopoverContent>
        </Popover>
      </span>
    </NodeViewWrapper>
  );
}

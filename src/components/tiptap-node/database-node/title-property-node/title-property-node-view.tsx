import { useState, useCallback, useRef, useEffect } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import "./title-property-node-view.scss";
import { ArrowUp, Check, PanelRight } from "lucide-react";
import { Button, ButtonGroup } from "src/components/tiptap-ui-primitive/button";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { Badge } from "src/components/tiptap-ui-primitive/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";

export function TitlePropertyNodeView({
  node,
  updateAttributes,
}: NodeViewProps) {
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const { /*pageId,*/ title /*, icon*/ } = node.attrs;
  const [draft, setDraft] = useState(title ?? "");

  const onSetDraft = useCallback((title: string) => setDraft(title), []);

  const handleLabelClick = useCallback(() => {
    setDraft(title ?? "");
    setEditing(true);
  }, [title]);

  // focus input when popover opens
  useEffect(() => {
    if (editing) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [editing, title, onSetDraft]);

  // click outside → cancel
  useEffect(() => {
    if (!editing) return;
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setEditing(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [editing]);

  const commit = useCallback(() => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    updateAttributes({ title: trimmed });
    setEditing(false);
  }, [draft, updateAttributes]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commit();
      }
      if (e.key === "Escape") {
        setEditing(false);
      }
    },
    [commit],
  );

  return (
    <NodeViewWrapper
      as="span"
      style={{ display: "inline-flex", position: "relative" }}
      data-node-id={node.attrs.nodeId}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <ButtonGroup orientation="horizontal" className="title-prop">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              style={{
                background: "transparent",
                color: "var(--tt-paragraph-text-color)",
              }}
              onClick={handleLabelClick}
            >
              <Check className="tiptap-button-icon" />
              <span style={{ fontSize: 17 }}> {title || "Untitled"}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent ref={popoverRef} side="right" align="center">
            <Card className="title-prop__popover">
              <CardItemGroup style={{ width: "100%" }} orientation="horizontal">
                <input
                  ref={inputRef}
                  className="title-prop__popover-input"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Page name..."
                />
                <Button
                  style={{
                    background: "var(--tt-brand-color-400)",
                    color: "white",
                    borderRadius: "var(--tt-radius-xl)",
                  }}
                  onClick={commit}
                  disabled={!draft.trim()}
                >
                  <ArrowUp className="tiptap-button-icon" />
                </Button>
              </CardItemGroup>
            </Card>
          </PopoverContent>
        </Popover>
        <Spacer orientation="horizontal" />

        {/* open badge — shown on hover */}
        <Badge
          data-style="gray"
          size="default"
          style={{
            cursor: "pointer",
            visibility: hovered ? "visible" : "hidden",
            transition: "visibility 0.2s ease",
          }}
        >
          <span className="tiptap-badge-text">Open</span>
          <PanelRight className="tiptap-badge-icon" />
        </Badge>
      </ButtonGroup>
    </NodeViewWrapper>
  );
}

import {
  NodeViewContent,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import { useCallback } from "react";
import type { DatabaseAttrs, MultiSelectCellAttrs } from "../types/types";
import type { SelectOption } from "../types/types";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { Check } from "lucide-react";

export function MultiSelectCellNodeView({
  node,
  editor,
  getPos,
  updateAttributes,
}: NodeViewProps) {
  const multiSelectAttrs = node.attrs as MultiSelectCellAttrs;

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
  if (!db) return null;

  const attrs = db.attrs as DatabaseAttrs;
  const prop = attrs.properties.find(
    (p) => p.id === multiSelectAttrs.propertyId,
  );

  if (!prop || prop.config.type !== "multi_select")
    return (
      <NodeViewWrapper
        as="div"
        className="db-td multi-select-cell"
        data-type="multi-select-cell"
      >
        <NodeViewContent />
      </NodeViewWrapper>
    );

  const selectedValues: SelectOption[] = multiSelectAttrs.value ?? [];

  function toggleOption(option: SelectOption) {
    const isSelected = selectedValues.some((v) => v.id === option.id);
    const newValue = isSelected
      ? selectedValues.filter((v) => v.id !== option.id)
      : [...selectedValues, option];
    updateAttributes({ ...multiSelectAttrs, value: newValue });
  }

  return (
    <NodeViewWrapper
      as="div"
      className="db-td multi-select-cell"
      data-type="multi-select-cell"
      style={{
        display: "flex",
        padding: "0 5px",
        alignItems: "center",
        gap: 4,
      }}
    >
      <Popover>
        <PopoverTrigger asChild>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              flex: 1,
              cursor: "pointer",
              minHeight: 34,
              flexWrap: "nowrap",
              overflow: "hidden",
            }}
          >
            {selectedValues.length > 0 ? (
              selectedValues.map((v) => (
                <Button
                  key={v.id}
                  variant="ghost"
                  style={{ background: v.color, minHeight: 18, height: 20 }}
                >
                  <span className="tiptap-button-text">{v.label}</span>
                </Button>
              ))
            ) : (
              <span style={{ opacity: 0 }}>_</span> // keeps the cell height
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent>
          <Card
            style={{
              minWidth: 100,
              padding: "10px 15px",
              borderRadius: "var(--tt-radius-sm)",
            }}
          >
            <CardItemGroup
              style={{
                width: "100%",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
              }}
            >
              {prop.config.options.map((option) => {
                const isSelected = selectedValues.some(
                  (v) => v.id === option.id,
                );
                return (
                  <Button
                    key={option.id}
                    variant="ghost"
                    style={{
                      background: option.color,
                      minHeight: 18,
                      height: 20,
                      outline: isSelected ? "2px solid white" : "none",
                    }}
                    onClick={() => toggleOption(option)}
                  >
                    {isSelected && (
                      <Check size={10} style={{ marginRight: 3 }} />
                    )}
                    <span className="tiptap-button-text">{option.label}</span>
                  </Button>
                );
              })}
            </CardItemGroup>
          </Card>
        </PopoverContent>
      </Popover>
    </NodeViewWrapper>
  );
}

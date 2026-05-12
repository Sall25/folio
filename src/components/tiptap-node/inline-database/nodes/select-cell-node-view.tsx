import {
  NodeViewContent,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import { useCallback } from "react";
import type { DatabaseAttrs, SelectCellAttrs } from "../types/types";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";

export function SelectCellNodeView({
  node,
  editor,
  getPos,
  updateAttributes,
}: NodeViewProps) {
  const selectAttrs = node.attrs as SelectCellAttrs;

  const getParentDatabase = useCallback(() => {
    const pos = getPos?.();
    if (pos == null) return null;
    const $pos = editor.state.doc.resolve(pos);
    for (let d = $pos.depth; d > 0; d--) {
      const node = $pos.node(d);
      if (node.type.name === "database") return node;
    }
    return null;
  }, [editor, getPos]);

  const db = getParentDatabase();

  if (!db) return null;

  const attrs = db.attrs as DatabaseAttrs;

  const prop = attrs.properties.find((p) => p.id === selectAttrs.propertyId);

  if (
    !prop ||
    prop.config.type !== "select" ||
    prop.config.options.length === 0
  )
    return (
      <NodeViewWrapper
        as="div"
        className="db-td select-cell"
        data-type="select-cell"
      >
        <NodeViewContent />
      </NodeViewWrapper>
    );

  return (
    <NodeViewWrapper
      as="div"
      className="db-td select-cell"
      data-type="select-cell"
      style={{
        display: "flex",
        padding: "0 5px",
        alignItem: "center",
        justifyContent: "center",
      }}
    >
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            style={{
              background: selectAttrs.value
                ? selectAttrs.value.color
                : prop.config.options[0].color,
              minHeight: 18,
              height: 20,
              width: 80,
              justifyContent: "center",
              borderRadius: "var(--tt-radius-sm)",
            }}
          >
            {selectAttrs.value ? (
              <span className="tiptap-button-text">
                {selectAttrs.value.label}
              </span>
            ) : (
              <span className="tiptap-button-text">
                {prop.config.options[0].label}
              </span>
            )}
          </Button>
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
              {prop.config.options.map((option) => (
                <Button
                  key={option.id}
                  variant="ghost"
                  style={{
                    background: option.color,
                    minHeight: 18,
                    height: 20,
                  }}
                  onClick={() =>
                    updateAttributes({ ...selectAttrs, value: option })
                  }
                >
                  <span className="tiptap-button-text">{option.label}</span>
                </Button>
              ))}
            </CardItemGroup>
          </Card>
        </PopoverContent>
      </Popover>
    </NodeViewWrapper>
  );
}

import {
  NodeViewWrapper,
  NodeViewContent,
  type NodeViewProps,
} from "@tiptap/react";

import type { CalloutAttrs } from "./types";

import "./callout-node.scss";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { DynamicIcon } from "src/features/pages/cover/dynamic-icon";
import { IconPickerPopover } from "src/features/pages/cover";

export function CalloutNodeView({ node, updateAttributes }: NodeViewProps) {
  const attrs = node.attrs as CalloutAttrs & {
    id?: string;
    backgroundColor?: string | null;
    color?: string;
    showIcon?: boolean;
    bordered?: boolean;
  };

  // Defaults preserve every existing callout: icon shown, grey background,
  // no border.
  const showIcon = attrs.showIcon !== false;
  const isTransparent = attrs.backgroundColor === "transparent";
  const background = isTransparent
    ? "transparent"
    : (attrs.backgroundColor ?? "var(--tt-color-highlight-gray)");

  return (
    <NodeViewWrapper data-type="callout" id={attrs.id}>
      <div
        className={`callout-root${showIcon ? "" : " callout-root--no-icon"}`}
        style={{
          background,
          color: attrs.color ?? "inherit",
          border: attrs.bordered
            ? "1px solid var(--tt-border-color)"
            : undefined,
        }}
      >
        {/* ── Icon (only when enabled) ── */}
        {showIcon && (
          <IconPickerPopover
            onRemove={() => updateAttributes({ showIcon: false })}
            onSelect={(name, color, target) => {
              updateAttributes({ iconName: name, color, target: target });
            }}
          >
            <Button
              variant="ghost"
              className="callout-icon-btn"
              style={{ fontSize: 20 }}
            >
              {attrs.target === "Emoji" && attrs.iconName}
              {attrs.target === "Icons" && attrs.iconName && (
                <DynamicIcon
                  name={attrs.iconName}
                  size={22}
                  style={{ color: attrs.color }}
                />
              )}
              {attrs.target === "Upload" && attrs.iconName && (
                <img
                  src={attrs.iconName}
                  alt="icon"
                  style={{
                    width: 20,
                    height: 20,
                    objectFit: "contain",
                    borderRadius: 4,
                    display: "block",
                  }}
                />
              )}
            </Button>
          </IconPickerPopover>
        )}

        {/* ── Content ── */}
        <div className="callout-content">
          <NodeViewContent />
        </div>
      </div>
    </NodeViewWrapper>
  );
}

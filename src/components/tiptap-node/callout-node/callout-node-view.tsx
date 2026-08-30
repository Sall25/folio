import { useState } from "react";
import {
  NodeViewWrapper,
  NodeViewContent,
  type NodeViewProps,
} from "@tiptap/react";

import type { CalloutAttrs } from "./types";

import "./callout-node.scss";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { DynamicIcon } from "src/components/tiptap-ui/cover/dynamic-icon";
import { IconPickerPopover } from "src/components/tiptap-ui/cover";

const DEFAULT_EMOJI = "🔔";

export function CalloutNodeView({ node, updateAttributes }: NodeViewProps) {
  const attrs = node.attrs as CalloutAttrs & {
    id?: string;
    backgroundColor?: string | null;
    color?: string;
    showIcon?: boolean;
    bordered?: boolean;
  };
  const [optionsOpen, setOptionsOpen] = useState(false);

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

        {/* ── Hover options (⋯): the only entry point when the icon is off ── */}
        <Popover open={optionsOpen} onOpenChange={setOptionsOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="callout-options-btn"
              aria-label="Callout options"
              contentEditable={false}
            >
              ⋯
            </button>
          </PopoverTrigger>
          <PopoverPortal container={document.getElementById("root")}>
            <PopoverContent
              style={{ position: "fixed", zIndex: 999 }}
              side="bottom"
              align="end"
            >
              <div className="callout-options-menu">
                <button
                  type="button"
                  className="callout-options-item"
                  onClick={() => {
                    updateAttributes({
                      showIcon: !showIcon,
                      iconName:
                        !showIcon && !attrs.iconName
                          ? DEFAULT_EMOJI
                          : attrs.iconName,
                    });
                    setOptionsOpen(false);
                  }}
                >
                  {showIcon ? "Remove icon" : "Add icon"}
                </button>
                <button
                  type="button"
                  className="callout-options-item"
                  onClick={() => {
                    updateAttributes({
                      backgroundColor: isTransparent ? null : "transparent",
                    });
                    setOptionsOpen(false);
                  }}
                >
                  {isTransparent ? "Add background" : "Remove background"}
                </button>
                <button
                  type="button"
                  className="callout-options-item"
                  onClick={() => {
                    updateAttributes({ bordered: !attrs.bordered });
                    setOptionsOpen(false);
                  }}
                >
                  {attrs.bordered ? "Remove border" : "Add border"}
                </button>
              </div>
            </PopoverContent>
          </PopoverPortal>
        </Popover>
      </div>
    </NodeViewWrapper>
  );
}

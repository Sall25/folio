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
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { DynamicIcon } from "src/features/pages/cover/dynamic-icon";
import { IconPickerPopover } from "src/features/pages/cover";
import { HIGHLIGHT_COLORS } from "src/components/tiptap-ui/color-highlight-button/use-color-highlight";

// The block background colours (same as "Color → background" on any block),
// in Notion's order. null = the default grey; "transparent" = none.
const PRESET_KEYS = [
  "gray",
  "brown",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "red",
];
const PRESETS = PRESET_KEYS.map((key) =>
  HIGHLIGHT_COLORS.find((c) => c.labelKey === `colors.highlights.${key}`),
).filter((c): c is (typeof HIGHLIGHT_COLORS)[number] => !!c);

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
          {/* Standard popover positioning, so it flips above the callout
              when there's no room below. */}
          <PopoverContent side="bottom" align="end" collisionPadding={8}>
            <div className="callout-options-menu">
              <div className="callout-options-label">Background</div>
              <div
                className="callout-swatches"
                role="radiogroup"
                aria-label="Callout background"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={isTransparent}
                  aria-label="No background"
                  title="None"
                  className="callout-swatch callout-swatch--none"
                  data-active={isTransparent ? "on" : "off"}
                  onClick={() =>
                    updateAttributes({ backgroundColor: "transparent" })
                  }
                />
                {PRESETS.map((preset) => {
                  // The default grey is stored as null (existing callouts).
                  const value =
                    preset.value === "var(--tt-color-highlight-gray)"
                      ? null
                      : preset.value;
                  const active =
                    (attrs.backgroundColor ?? null) === value && !isTransparent;
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      aria-label={preset.label}
                      title={preset.label.replace(" background", "")}
                      className="callout-swatch"
                      data-active={active ? "on" : "off"}
                      style={{ background: preset.value }}
                      onClick={() =>
                        updateAttributes({ backgroundColor: value })
                      }
                    />
                  );
                })}
              </div>
              <div className="callout-options-sep" />
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
                  updateAttributes({ bordered: !attrs.bordered });
                  setOptionsOpen(false);
                }}
              >
                {attrs.bordered ? "Remove border" : "Add border"}
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </NodeViewWrapper>
  );
}

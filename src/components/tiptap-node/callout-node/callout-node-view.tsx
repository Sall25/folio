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
import { IconPickerCard } from "src/components/tiptap-ui/cover/icon-picker-card";
import { useLocalStorage } from "src/components/tiptap-templates/simple/hooks/use-local-storage";
import type { Target } from "src/components/tiptap-ui/cover/types";

const DEFAULT_EMOJI = "🔔";
const DEFAULT_ICON = "Bell";

export function CalloutNodeView({ node, updateAttributes }: NodeViewProps) {
  const attrs = node.attrs as CalloutAttrs & {
    id?: string;
    backgroundColor?: string | null;
    color?: string;
  };
  const [open, setOpen] = useState(false);
  const [lastTab, setLastTab] = useLocalStorage<Target>(
    "folio:icon-picker:tab",
    "Emoji",
  );

  return (
    <NodeViewWrapper data-type="callout" id={attrs.id}>
      <div
        className="callout-root"
        style={{
          background: attrs.backgroundColor ?? "var(--tt-color-highlight-gray)",
          color: attrs.color ?? "inherit",
        }}
      >
        {/* ── Icon ── */}
        <div className="callout-icon-wrap" style={{ position: "relative" }}>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className="attrs-icon-btn"
                style={{
                  fontSize: 20,
                }}
              >
                {attrs.target === "Emoji" && attrs.iconName}
                {attrs.target === "Icons" && attrs.iconName && (
                  <DynamicIcon
                    name={attrs.iconName}
                    stroke={attrs.color}
                    size={22}
                    strokeWidth={2}
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
            </PopoverTrigger>
            <PopoverPortal container={document.getElementById("root")}>
              <PopoverContent
                style={{ position: "fixed", zIndex: 999 }}
                side="bottom"
                align="start"
              >
                <IconPickerCard
                  target={open ? lastTab : (attrs.target ?? "Emoji")}
                  onTargetChange={(target) => {
                    setLastTab(target);
                    updateAttributes({
                      target,
                      iconName:
                        target === "Emoji" ? DEFAULT_EMOJI : DEFAULT_ICON,
                    });
                  }}
                  onSelect={(name, color) =>
                    updateAttributes({ iconName: name, color, target: lastTab })
                  }
                />
              </PopoverContent>
            </PopoverPortal>
          </Popover>
        </div>

        {/* ── Content ── */}
        <div className="callout-content">
          <NodeViewContent />
        </div>
      </div>
    </NodeViewWrapper>
  );
}

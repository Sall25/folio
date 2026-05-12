import { useRef, useCallback } from "react";
import {
  NodeViewWrapper,
  NodeViewContent,
  type NodeViewProps,
} from "@tiptap/react";

import type { CalloutAttrs, CalloutColor } from "./types";
import { getCalloutColor } from "./config";
import { EmojiPicker } from "./emoji-picker";

import "./callout-node.scss";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Button } from "src/components/tiptap-ui-primitive/button";

export function CalloutNodeView({ node, updateAttributes }: NodeViewProps) {
  const attrs = node.attrs as CalloutAttrs;
  const pickerRef = useRef<HTMLDivElement>(null);

  const colorConfig = getCalloutColor(attrs.color);
  const theme = colorConfig.theme;

  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      updateAttributes({ emoji });
    },
    [updateAttributes],
  );

  const handleColorSelect = useCallback(
    (color: CalloutColor) => {
      updateAttributes({ color });
      // Keep picker open on color tab so user can still change emoji
    },
    [updateAttributes],
  );

  return (
    <NodeViewWrapper>
      <div
        className="callout-root"
        style={{
          background: theme.bg,
        }}
      >
        {/* ── Icon ── */}
        <div className="callout-icon-wrap" style={{ position: "relative" }}>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                className="callout-icon-btn"
                aria-label="Change icon"
                contentEditable={false}
              >
                {attrs.emoji}
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <div
                ref={pickerRef}
                className="callout-picker-wrap"
                contentEditable={false}
              >
                <EmojiPicker
                  currentEmoji={attrs.emoji}
                  currentColor={attrs.color}
                  onEmojiSelect={handleEmojiSelect}
                  onColorSelect={handleColorSelect}
                />
              </div>
            </PopoverContent>
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

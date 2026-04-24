import { lazy, Suspense } from "react";
import { Card } from "src/components/tiptap-ui-primitive/card";
import { Tabs } from "./tabs";
import { EmojiPicker } from "./emoji-picker";
import type { Target } from "./types";

const IconPicker = lazy(() =>
  import("./icon-picker").then((m) => ({ default: m.IconPicker })),
);

export function IconPickerCard({
  target,
  onTargetChange,
  onSelect,
}: {
  target: Target;
  onTargetChange: (t: Target) => void;
  onSelect: (name: string, color?: string) => void;
}) {
  return (
    <Card
      style={{
        padding: "10px 15px",
        minWidth: 250,
        minHeight: 40,
        maxWidth: 380,
        overflow: "hidden",
      }}
    >
      <Tabs target={target} onActive={onTargetChange} />
      {target === "Emoji" && <EmojiPicker onSelect={onSelect} />}
      {target === "Icons" && (
        <Suspense
          fallback={
            <span
              style={{
                fontSize: 13,
                color: "var(--tt-text-color)",
                padding: "16px 0",
                display: "block",
                textAlign: "center",
              }}
            >
              Loading icons…
            </span>
          }
        >
          <IconPicker onSelect={onSelect} />
        </Suspense>
      )}
    </Card>
  );
}

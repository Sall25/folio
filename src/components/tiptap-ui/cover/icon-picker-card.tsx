import { lazy, Suspense } from "react";
import { Card, CardFooter } from "src/components/tiptap-ui-primitive/card";
import { Tabs } from "./tabs";
import { EmojiPicker } from "./emoji-picker";
import { UploadIconTab } from "./upload-icon-tab";
import type { Target } from "./types";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { Trash } from "lucide-react";

const IconPicker = lazy(() =>
  import("./icon-picker").then((m) => ({ default: m.IconPicker })),
);

export function IconPickerCard({
  target,
  onTargetChange,
  onSelect,
  onRemove,
}: {
  target: Target;
  onTargetChange: (t: Target) => void;
  onSelect: (name: string, color?: string, target?: Target) => void;
  onRemove?: () => void;
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
      {target === "Upload" && (
        <UploadIconTab onSelect={(url) => onSelect(url, undefined, "Upload")} />
      )}

      <Separator orientation="horizontal" style={{ height: 0.5 }} />

      {onRemove && (
        <CardFooter
          style={{
            marginTop: 8,
            paddingTop: 8,
            width: "100%",
            justifyContent: "flex-start",
          }}
        >
          <Button
            variant="ghost"
            onClick={onRemove}
            style={{
              fontSize: 13,
              color: "var(--tt-danger-color, #e03e3e)",
            }}
          >
            <Trash className="tiptap-button-icon" stroke="#e03e3e" />
            <span className="tiptap-button-text">Remove icon</span>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

import { lazy, Suspense } from "react";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { Tabs } from "./tabs";
import { UploadIconTab } from "./upload-icon-tab";
import type { Target } from "./types";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { useIconRecents } from "src/components/tiptap-templates/simple/hooks/use-icon-recents";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { SpinnerRing } from "src/components/tiptap-ui-primitive/spinner-ring";

const IconPicker = lazy(() =>
  import("./icon-picker").then((m) => ({ default: m.IconPicker })),
);

const EmojiPicker = lazy(() =>
  import("./emoji-picker").then((m) => ({ default: m.EmojiPicker })),
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
  const { setTab, recordEmoji, recordIcon, recordUpload } = useIconRecents();

  const handleTargetChange = (t: Target) => {
    setTab(t);
    onTargetChange(t);
  };

  // Record into recents (by the active tab) on every pick, then hand off to the
  // consumer. This is the single integration point — callout and cover both
  // route through here, so both gain recents with no changes of their own.
  const handleSelect = (name: string, color?: string) => {
    if (target === "Emoji") recordEmoji(name);
    else if (target === "Icons") recordIcon({ name, color });
    else if (target === "Upload") recordUpload(name);
    onSelect(name, color, target);
  };

  return (
    <Card
      style={{
        padding: "10px 0px",
        minWidth: 400,
        minHeight: 40,
        maxWidth: 500,
        overflow: "hidden",
        borderRadius: "var(--tt-radius-md)",
        border: "1px solid var(--tt-border-color)",
        boxShadow: "var(--tt-shadow-elevated-md)",
      }}
    >
      <Spacer orientation="vertical" size={4} />
      <CardItemGroup orientation="horizontal" style={{ width: "100%" }}>
        <Spacer orientation="horizontal" size={4} />
        <Tabs target={target} onActive={handleTargetChange} />
        <Spacer orientation="horizontal" />
        <Button
          variant="ghost"
          className="tiptap-button-delete"
          onClick={onRemove}
        >
          <span className="tiptap-button-text">Remove</span>
        </Button>
        <Spacer orientation="horizontal" size={4} />
      </CardItemGroup>
      <Spacer orientation="vertical" size={6} />

      {target === "Emoji" && (
        <Suspense
          fallback={
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "24px 0",
              }}
            >
              <SpinnerRing />
            </div>
          }
        >
          <EmojiPicker onSelect={handleSelect} />
        </Suspense>
      )}
      {target === "Icons" && (
        <Suspense
          fallback={
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "24px 0",
              }}
            >
              <SpinnerRing />
            </div>
          }
        >
          <IconPicker onSelect={handleSelect} />
        </Suspense>
      )}
      {target === "Upload" && (
        <UploadIconTab onSelect={(url) => handleSelect(url)} />
      )}
    </Card>
  );
}

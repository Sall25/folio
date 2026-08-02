import { lazy, Suspense } from "react";
import { Card, CardFooter } from "src/components/tiptap-ui-primitive/card";
import { Tabs } from "./tabs";
import { EmojiPicker } from "./emoji-picker";
import { UploadIconTab } from "./upload-icon-tab";
import type { Target } from "./types";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { DynamicIcon } from "src/components/tiptap-ui/cover/dynamic-icon";
import { useIconRecents } from "src/components/tiptap-templates/simple/hooks/use-icon-recents";
import { RecentIconRow } from "src/components/tiptap-templates/simple/components/recent-icon-row";

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
  const { recents, setTab, recordEmoji, recordIcon, recordUpload } =
    useIconRecents();

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
        padding: "10px 15px",
        minWidth: 250,
        minHeight: 40,
        maxWidth: 380,
        overflow: "hidden",
        border: "1px solid var(--tt-border-color)",
        boxShadow: "var(--tt-shadow-elevated-md)",
      }}
    >
      <Tabs target={target} onActive={handleTargetChange} />

      <RecentIconRow
        target={target}
        recents={recents}
        onSelect={handleSelect}
      />

      {target === "Emoji" && <EmojiPicker onSelect={handleSelect} />}
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
          <IconPicker onSelect={handleSelect} />
        </Suspense>
      )}
      {target === "Upload" && (
        <UploadIconTab onSelect={(url) => handleSelect(url)} />
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
            <DynamicIcon
              className="tiptap-button-icon"
              name="delete"
              size={18}
              style={{ color: "#e03e3e" }}
            />
            <span className="tiptap-button-text">Remove icon</span>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

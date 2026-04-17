import { Card } from "src/components/tiptap-ui-primitive/card";
import { Tabs } from "./tabs";
import { EmojiPicker } from "./emoji-picker";
import { IconPicker } from "./icon-picker";
import type { Target } from "./types";

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
    <Card style={{ padding: "10px 15px", maxWidth: 380, overflow: "hidden" }}>
      <Tabs target={target} onActive={onTargetChange} />
      {target === "Emoji" && <EmojiPicker onSelect={onSelect} />}
      {target === "Icons" && <IconPicker onSelect={onSelect} />}
    </Card>
  );
}

import { SmilePlus } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Card } from "src/components/tiptap-ui-primitive/card";
import "./reaction-picker.scss";

// Curated quick-reaction set (Slack/Linear style). A full searchable picker can
// be added later; for reactions a small common set is the convention.
const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉", "😮", "😢", "👀", "🔥"];

// A small popover of common emojis. Opened from the react button on a comment;
// picking one calls onPick(emoji).
export function ReactionPicker({
  onPick,
}: {
  onPick: (emoji: string) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="reaction-picker__trigger"
          title="Add reaction"
        >
          <SmilePlus size={15} />
        </button>
      </PopoverTrigger>
      <PopoverPortal container={document.getElementById("root")}>
        <PopoverContent
          side="top"
          align="start"
          sideOffset={6}
          style={{ zIndex: 9999 }}
        >
          <Card className="reaction-picker">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="reaction-picker__emoji"
                onClick={() => onPick(emoji)}
              >
                {emoji}
              </button>
            ))}
          </Card>
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
}

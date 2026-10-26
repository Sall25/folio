import { Button } from "src/components/tiptap-ui-primitive/button";
import { UploadedIcon } from "src/components/uploaded-icon/uploaded-icon";
import { IconColorPopover } from "src/features/pages/cover/icon-color-popover";
import type { Target } from "src/features/pages/cover/types";
import type {
  IconRecents,
  RecentIcon,
} from "../../../pages/cover/use-icon-recents";
import "./recent-icon-row.scss";

export function RecentIconRow({
  target,
  recents,
  onSelect,
}: {
  target: Target;
  recents: IconRecents;
  onSelect: (name: string, color?: string) => void;
}) {
  const empty =
    (target === "Emoji" && recents.emoji.length === 0) ||
    (target === "Icons" && recents.icon.length === 0) ||
    (target === "Upload" && (recents.upload?.length ?? 0) === 0);

  if (empty) return null;

  return (
    <div className="icon-recents">
      <div className="icon-recents__label">Recent</div>
      <div className="icon-recents__row">
        {target === "Emoji" &&
          recents.emoji.map((glyph) => (
            <Button
              key={glyph}
              variant="ghost"
              className="icon-recents__item"
              style={{ fontSize: 18 }}
              onClick={() => onSelect(glyph)}
            >
              {glyph}
            </Button>
          ))}

        {target === "Icons" &&
          recents.icon.map((it: RecentIcon) => (
            // A popover with the colours, like the picker's grid.
            <IconColorPopover
              key={it.name}
              name={it.name}
              color={it.color ?? "var(--tt-text-primary)"}
              onSelect={onSelect}
              className="icon-recents__item"
            />
          ))}

        {target === "Upload" &&
          (recents.upload ?? []).map((url) => (
            <Button
              key={url}
              variant="ghost"
              className="icon-recents__item"
              onClick={() => onSelect(url)}
            >
              <UploadedIcon src={url} size={18} />
            </Button>
          ))}
      </div>
    </div>
  );
}

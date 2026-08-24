import { Button } from "src/components/tiptap-ui-primitive/button";
import { DynamicIcon } from "src/components/tiptap-ui/cover/dynamic-icon";
import type { Target } from "src/components/tiptap-ui/cover/types";
import type { IconRecents, RecentIcon } from "../../hooks/use-icon-recents";
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
            <Button
              key={it.name}
              variant="ghost"
              className="icon-recents__item"
              onClick={() => onSelect(it.name, it.color)}
            >
              <DynamicIcon
                name={it.name}
                size={18}
                style={{
                  color: it.color ?? "var(--tt-text-primary)",
                  width: 20,
                  height: 20,
                }}
              />
            </Button>
          ))}

        {target === "Upload" &&
          (recents.upload ?? []).map((url) => (
            <Button
              key={url}
              variant="ghost"
              className="icon-recents__item"
              onClick={() => onSelect(url)}
            >
              <img
                src={url}
                alt=""
                style={{
                  width: 18,
                  height: 18,
                  objectFit: "contain",
                  borderRadius: 3,
                  display: "block",
                }}
              />
            </Button>
          ))}
      </div>
    </div>
  );
}

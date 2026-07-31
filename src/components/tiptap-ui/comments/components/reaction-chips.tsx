import type { Reactions } from "src/types";
import { reactionEntries } from "src/lib/comment-reactions";
import type { ID } from "src/types";
import "./reaction-chips.scss";

// The reaction chips under a comment: each emoji + count, highlighted if the
// current person reacted, click to toggle. Includes the add-reaction picker.
export function ReactionChips({
  reactions,
  currentPersonId,
  onToggle,
}: {
  reactions: Reactions;
  currentPersonId?: ID;
  onToggle: (emoji: string) => void;
}) {
  const entries = reactionEntries(reactions);
  if (entries.length === 0) return null;

  return (
    <div className="reaction-chips">
      {entries.map(([emoji, ids]) => {
        const reacted = currentPersonId ? ids.includes(currentPersonId) : false;
        return (
          <button
            key={emoji}
            type="button"
            className={`reaction-chip${reacted ? " is-reacted" : ""}`}
            onClick={() => onToggle(emoji)}
            title={`${ids.length} reaction${ids.length > 1 ? "s" : ""}`}
          >
            <span className="reaction-chip__emoji">{emoji}</span>
            <span className="reaction-chip__count">{ids.length}</span>
          </button>
        );
      })}
    </div>
  );
}

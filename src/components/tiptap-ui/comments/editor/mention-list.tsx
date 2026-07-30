import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import "./mention-list.scss";

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

interface Item {
  id: string;
  label: string;
  email: string;
}

interface MentionListProps {
  items: Item[];
  command: (item: { id: string; label: string }) => void;
}

// The @-mention dropdown. Keyboard-navigable (↑/↓/Enter), click to select.
export const MentionList = forwardRef<MentionListRef, MentionListProps>(
  ({ items, command }, ref) => {
    const [selected, setSelected] = useState(0);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => setSelected(0), [items]);

    const select = (index: number) => {
      const item = items[index];
      if (item) command({ id: item.id, label: item.label });
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowUp") {
          setSelected((s) => (s + items.length - 1) % items.length);
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelected((s) => (s + 1) % items.length);
          return true;
        }
        if (event.key === "Enter") {
          select(selected);
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) {
      return <div className="mention-list is-empty">No people found</div>;
    }

    return (
      <div className="mention-list">
        {items.map((item, i) => (
          <button
            type="button"
            key={item.id}
            className={`mention-list__item${i === selected ? " is-selected" : ""}`}
            onMouseEnter={() => setSelected(i)}
            onClick={() => select(i)}
          >
            <span className="mention-list__avatar">
              {item.label.charAt(0).toUpperCase()}
            </span>
            <span className="mention-list__text">
              <span className="mention-list__name">{item.label}</span>
              <span className="mention-list__email">{item.email}</span>
            </span>
          </button>
        ))}
      </div>
    );
  },
);

MentionList.displayName = "MentionList";

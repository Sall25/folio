import { useRef, useState } from "react";
import { Check } from "lucide-react";
import type { StatusGroup, StatusItem } from "src/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";

interface StatusCellDisplayProps {
  value: string | null; // StatusItem.id
  groups: StatusGroup[];
  onChange?: (item: StatusItem) => void;
  readonly?: boolean;
}

export function StatusCellDisplay({
  value,
  groups,
  onChange,
  readonly = false,
}: StatusCellDisplayProps) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const allItems = groups.flatMap((g) => g.items);
  const selectedItem = allItems.find((item) => item.id === value) ?? null;

  const filteredGroups = groups
    .map((g) => ({
      ...g,
      items: g.items.filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase()),
      ),
    }))
    .filter((g) => g.items.length > 0);

  const trigger = (
    <button
      className={`status-badge status-badge--${selectedItem?.color ?? "gray"}`}
      contentEditable={false}
    >
      <span className="status-badge__dot" />
      <span className="status-badge__label">
        {selectedItem?.name ?? "No status"}
      </span>
    </button>
  );

  if (readonly || !onChange) return trigger;

  return (
    <Popover
      onOpenChange={(open) => {
        if (open) setTimeout(() => inputRef.current?.focus(), 0);
        else setSearch("");
      }}
    >
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="status-dropdown">
        <div className="status-dropdown__search">
          <input
            ref={inputRef}
            className="status-dropdown__input"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="status-dropdown__list">
          {filteredGroups.map((group) => (
            <div key={group.id} className="status-dropdown__group">
              <span className="status-dropdown__group-label">
                {group.label}
              </span>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  className="status-dropdown__option"
                  onClick={() => onChange(item)}
                >
                  <span className={`status-badge status-badge--${item.color}`}>
                    <span className="status-badge__dot" />
                    <span className="status-badge__label">{item.name}</span>
                  </span>
                  {item.id === value && (
                    <Check size={13} className="status-dropdown__check" />
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

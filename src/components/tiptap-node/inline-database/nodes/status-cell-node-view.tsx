import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useCallback, useRef, useState } from "react";
import type { DatabaseAttrs, StatusCellAttrs } from "../types/types";
import type { StatusItem, StatusGroup } from "../types/types";
import { Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import "./status-cell-node-view.scss";

export function StatusCellNodeView({
  node,
  editor,
  getPos,
  updateAttributes,
}: NodeViewProps) {
  const statusAttrs = node.attrs as StatusCellAttrs;
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const getParentDatabase = useCallback(() => {
    const pos = getPos?.();
    if (pos == null) return null;
    const $pos = editor.state.doc.resolve(pos);
    for (let d = $pos.depth; d > 0; d--) {
      const n = $pos.node(d);
      if (n.type.name === "database") return n;
    }
    return null;
  }, [editor, getPos]);

  const db = getParentDatabase();
  if (!db) return null;

  const attrs = db.attrs as DatabaseAttrs;
  const prop = attrs.properties.find((p) => p.id === statusAttrs.propertyId);

  if (!prop || prop.config.type !== "status")
    return (
      <NodeViewWrapper
        as="div"
        className="db-td status-cell"
        data-type="status-cell"
      />
    );

  const groups: StatusGroup[] = prop.config.groups ?? [];
  const allItems = groups.flatMap((g) => g.items);
  const selectedItem =
    allItems.find((item) => item.id === statusAttrs.value) ?? null;

  const filteredGroups = groups
    .map((g) => ({
      ...g,
      items: g.items.filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase()),
      ),
    }))
    .filter((g) => g.items.length > 0);

  function selectItem(item: StatusItem) {
    updateAttributes({ value: item.id });
  }

  return (
    <NodeViewWrapper
      as="div"
      className="db-td status-cell"
      data-type="status-cell"
    >
      <Popover
        onOpenChange={(open) => {
          if (open) setTimeout(() => inputRef.current?.focus(), 0);
          else setSearch("");
        }}
      >
        <PopoverTrigger asChild>
          <button
            className={`status-badge status-badge--${selectedItem?.color ?? "gray"}`}
            contentEditable={false}
          >
            <span className="status-badge__dot" />
            <span className="status-badge__label">
              {selectedItem?.name ?? "No status"}
            </span>
          </button>
        </PopoverTrigger>

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
                {group.items.map((item) => {
                  const isSelected = item.id === statusAttrs.value;
                  return (
                    <button
                      key={item.id}
                      className="status-dropdown__option"
                      onClick={() => selectItem(item)}
                    >
                      <span
                        className={`status-badge status-badge--${item.color}`}
                      >
                        <span className="status-badge__dot" />
                        <span className="status-badge__label">{item.name}</span>
                      </span>
                      {isSelected && (
                        <Check size={13} className="status-dropdown__check" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </NodeViewWrapper>
  );
}

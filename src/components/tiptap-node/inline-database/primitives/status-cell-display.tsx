import { useState } from "react";
import { Check } from "lucide-react";
import type { StatusGroup, StatusItem } from "src/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Input } from "src/components/tiptap-ui-primitive/input";
import { StatusPill } from "../ui/status/status-edit-display";
import "./status-cell-display.scss";
import {
  Card,
  CardBody,
  CardHeader,
} from "src/components/tiptap-ui-primitive/card";

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
  const [open, setOpen] = useState(false);

  const allItems = (groups ?? []).flatMap((g) => g.items);
  const selectedItem =
    allItems.find((item) => item.id === value) ?? allItems[0];

  const q = search.trim().toLowerCase();
  const filteredGroups = (groups ?? [])
    .map((g) => ({
      ...g,
      items: q
        ? g.items.filter((item) => item.name.toLowerCase().includes(q))
        : g.items,
    }))
    .filter((g) => g.items.length > 0);

  const trigger = (
    <button
      className="status-cell__trigger"
      contentEditable={false}
      onClick={() => setOpen(true)}
    >
      {selectedItem ? (
        <StatusPill name={selectedItem.name} color={selectedItem.color} />
      ) : (
        <StatusPill name="No status" color="gray" />
      )}
    </button>
  );

  if (readonly || !onChange || !open) return trigger;

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        {/* Opening from onClick sidesteps ProseMirror, which suppresses the
            pointerdown Radix's trigger listens for inside a
            contentEditable=false NodeView. Same fix as CellEditorPopover. */}
        <button
          className="status-cell__trigger"
          contentEditable={false}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
        >
          {selectedItem ? (
            <StatusPill name={selectedItem.name} color={selectedItem.color} />
          ) : (
            <StatusPill name="No status" color="gray" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        avoidCollisions
        collisionPadding={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Card style={{ padding: "5px", borderRadius: "var(--tt-radius-sm)" }}>
          <CardHeader>
            <Input
              autoFocus
              value={search}
              placeholder="Search..."
              onChange={(e) => setSearch(e.target.value)}
              style={{ height: 28 }}
            />
          </CardHeader>
          <CardBody style={{ width: "100%" }}>
            {filteredGroups.length === 0 ? (
              <span className="status-dropdown__empty">No statuses found</span>
            ) : (
              filteredGroups.map((group) => (
                <div key={group.id} className="status-dropdown__group">
                  <span className="status-dropdown__group-label">
                    {group.label}
                  </span>
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      className="status-dropdown__option"
                      onClick={() => {
                        onChange(item);
                        setOpen(false);
                      }}
                    >
                      <StatusPill name={item.name} color={item.color} />
                      {item.id === value && (
                        <Check size={14} className="status-dropdown__check" />
                      )}
                    </button>
                  ))}
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </PopoverContent>
    </Popover>
  );
}

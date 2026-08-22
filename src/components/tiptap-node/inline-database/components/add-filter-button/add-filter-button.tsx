import { useState } from "react";
import { Plus, ChevronDown } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "src/components/tiptap-ui-primitive/dropdown-menu";
import { DynamicIcon } from "src/components/tiptap-ui/cover/dynamic-icon";
import { PROPERTY_TYPE_ICONS } from "src/types/property-type-meta";
import type { DatabaseProperty, ID } from "src/types";

export function AddFilterButton({
  onPick,
  properties,
}: {
  properties: DatabaseProperty[];
  onPick: (propertyId: ID) => void;
}) {
  const [open, setOpen] = useState(false);

  // Closed: plain trigger. Mount the menu only when open (same lazy pattern
  // as the other dropdowns — avoids always-mounted Radix).
  if (!open) {
    return (
      <Button
        contentEditable={false}
        variant="ghost"
        onClick={() => setOpen(true)}
        style={{
          justifyContent: "flex-start",
          gap: 4,
          background: "transparent",
        }}
      >
        <Plus className="tiptap-button-icon" size={14} />
        <span className="tiptap-button-text">Filter</span>
      </Button>
    );
  }

  return (
    <DropdownMenu open onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          contentEditable={false}
          variant="ghost"
          style={{ justifyContent: "flex-start", gap: 4 }}
        >
          <Plus className="tiptap-button-icon" size={14} />
          <span className="tiptap-button-text">Filter</span>
          <ChevronDown className="tiptap-button-icon-sub" size={12} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent contentEditable={false}>
        <Card
          className="option-dropdown"
          style={{
            padding: 5,
            minWidth: 200,
            maxHeight: 300,
            overflowY: "auto",
            border: "1px solid var(--tt-border-color)",
          }}
        >
          <CardItemGroup style={{ width: "100%" }}>
            {properties.map((p) => (
              <DropdownMenuItem key={p.id} asChild>
                <Button
                  variant="ghost"
                  style={{ justifyContent: "flex-start", width: "100%" }}
                  onClick={() => {
                    onPick(p.id);
                    setOpen(false);
                  }}
                >
                  <DynamicIcon
                    name={PROPERTY_TYPE_ICONS[p.config.type]}
                    size={16}
                    filled={false}
                    className="tiptap-button-icon"
                  />
                  <span className="tiptap-button-text">{p.name}</span>
                </Button>
              </DropdownMenuItem>
            ))}
          </CardItemGroup>
        </Card>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

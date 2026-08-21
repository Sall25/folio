import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "src/components/tiptap-ui-primitive/dropdown-menu";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";

export function OptionDropdown({
  current,
  options,
  includeAny = true,
  onSelect,
}: {
  current: string;
  options: { id: string; label: string }[];
  includeAny?: boolean;
  onSelect: (id: string, label?: string) => void;
}) {
  const selected = options.find((o) => o.id === current);
  const label = selected ? selected.label : includeAny ? "Any" : "Select…";
  const [open, setOpen] = useState(false);

  if (!open)
    return (
      <Button
        contentEditable={false}
        variant="ghost"
        onClick={() => setOpen(true)}
        className="option-dropdown-button"
      >
        <span className="tiptap-button-text">{label}</span>
        <Spacer size={0.5} orientation="horizontal" />
        <ChevronDown className="tiptap-button-icon-sub" />
      </Button>
    );

  return (
    <DropdownMenu open onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          contentEditable={false}
          variant="ghost"
          className="option-dropdown-button"
        >
          <span className="tiptap-button-text">{label}</span>
          <Spacer size={0.5} orientation="horizontal" />
          <ChevronDown className="tiptap-button-icon-sub" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <Card
          className="option-dropdown"
          style={{
            padding: "5px",
            minWidth: 160,
            maxHeight: 260,
            overflowY: "auto",
            boxShadow: "var(--tt-shadow-elevated-sm)",
          }}
        >
          <CardItemGroup
            style={{ width: "100%", justifyContent: "flex-start" }}
          >
            {includeAny && (
              <DropdownMenuItem asChild>
                <Button
                  variant="ghost"
                  style={{ justifyContent: "flex-start", width: "100%" }}
                  data-active-state={current === "" ? "on" : "off"}
                  onClick={() => onSelect("", "any")}
                >
                  <span className="tiptap-button-text">Any</span>
                </Button>
              </DropdownMenuItem>
            )}
            {options.map((o) => (
              <DropdownMenuItem key={o.id} asChild>
                <Button
                  variant="ghost"
                  style={{ justifyContent: "flex-start", width: "100%" }}
                  data-active-state={current === o.id ? "on" : "off"}
                  onClick={() => onSelect(o.id, o.label)}
                >
                  <span className="tiptap-button-text">{o.label}</span>
                </Button>
              </DropdownMenuItem>
            ))}
          </CardItemGroup>
        </Card>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

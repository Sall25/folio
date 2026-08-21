import { ChevronDown } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card } from "src/components/tiptap-ui-primitive/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "src/components/tiptap-ui-primitive/dropdown-menu";
import type { FilterOperator } from "src/types";
import { useState } from "react";
import "./operators-dropdown.scss";

export function OperatorsDropdown({
  current,
  operators,
}: {
  current: FilterOperator;
  operators: FilterOperator[];
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        size="small"
        variant="ghost"
        className="operators-dropdown-trigger"
      >
        {current}
      </Button>
    );
  }

  return (
    <DropdownMenu open onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          size="small"
          variant="ghost"
          className="operators-dropdown-trigger"
        >
          <span className="tiptap-button-text">{current}</span>
          <ChevronDown className="tiptap-button-icon-sub" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <Card className="operators-dropdown-card">
          <DropdownMenuGroup>
            {operators.map((op, index) => (
              <DropdownMenuItem key={index} asChild>
                <Button className="operator-dropdown-item" variant="ghost">
                  <span className="tiptap-button-text">{op}</span>
                </Button>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </Card>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

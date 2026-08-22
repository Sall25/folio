import { Check, ChevronDown } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card } from "src/components/tiptap-ui-primitive/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "src/components/tiptap-ui-primitive/dropdown-menu";
import {
  OPERATOR_LABEL,
  type FilterOperator,
  type FilterRule,
} from "src/types";
import { useState } from "react";
import "./operators-dropdown.scss";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";

export function OperatorsDropdown({
  current,
  operators,
  onChange,
}: {
  current: FilterOperator;
  operators: FilterOperator[];
  onChange: (patch: Partial<FilterRule>) => void;
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
        {OPERATOR_LABEL[current]}
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
          <span className="tiptap-button-text">{OPERATOR_LABEL[current]}</span>
          <ChevronDown className="tiptap-button-icon-sub" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <Card className="operators-dropdown-card">
          <DropdownMenuGroup className="operator-dropdown-group">
            {operators.map((op, index) => (
              <DropdownMenuItem key={index} asChild>
                <Button
                  className="operator-dropdown-item"
                  variant="ghost"
                  onClick={() => onChange({ operator: op })}
                >
                  <span className="tiptap-button-text">
                    {OPERATOR_LABEL[op]}
                  </span>
                  {op === current && (
                    <>
                      <Spacer orientation="horizontal" />
                      <Check className="tiptap-button-icon-sub item-checked" />
                    </>
                  )}
                </Button>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </Card>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

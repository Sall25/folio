import { ListFilter, MoreHorizontal, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "src/components/tiptap-ui-primitive/dropdown-menu";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card } from "src/components/tiptap-ui-primitive/card";
import { OperatorsDropdown } from "./operators-dropdown";
import {
  OPERATORS_FOR_TYPE,
  type FilterOperator,
  type FilterRule,
} from "src/types";
import { useCallback, useState } from "react";
import "./filter-rule-header.scss";
import { ConfirmDialog } from "src/components/tiptap-templates/simple/components/confirm-dialog";

export function FilterRuleHeader({
  propertyName,
  rule,
  onChange,
  onDelete,
  onPromote,
}: {
  propertyName: string;
  rule: FilterRule;
  onChange: (patch: Partial<FilterRule>) => void;
  onDelete: () => void;
  onPromote: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const operators = OPERATORS_FOR_TYPE[rule.propertyType] as FilterOperator[];
  const handleDeleteFilter = () => onDelete();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const onClose = useCallback(() => setConfirmOpen(false), []);

  return (
    <>
      <div className="filter-rule-header">
        <div className="filter-rule-header__left">
          <span className="filter-rule-header__prop">{propertyName}</span>
          <OperatorsDropdown
            current={rule.operator}
            operators={operators}
            onChange={onChange}
          />
        </div>

        {/* Ellipsis menu — filter actions (delete) */}
        {!menuOpen ? (
          <Button
            size="small"
            variant="ghost"
            className="filter-rule-header__more"
            onClick={() => setMenuOpen(true)}
            aria-label="Filter options"
          >
            <MoreHorizontal className="tiptap-button-icon" />
          </Button>
        ) : (
          <DropdownMenu open onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                size="small"
                variant="ghost"
                className="filter-rule-header__more"
                aria-label="Filter options"
              >
                <MoreHorizontal className="tiptap-button-icon" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <Card className="filter-rule-header__menu-card">
                <DropdownMenuItem asChild>
                  <Button
                    variant="ghost"
                    className="tiptap-button-delete filter-rule-header__menu-item"
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirmOpen(true);
                    }}
                  >
                    <Trash2 className="tiptap-button-icon" size={14} />
                    <span className="tiptap-button-text">Delete filter</span>
                  </Button>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Button
                    variant="ghost"
                    className="filter-rule-header__menu-item"
                    onClick={() => {
                      onPromote();
                      setMenuOpen(false);
                    }}
                  >
                    <ListFilter className="tiptap-button-icon" size={14} />
                    <span className="tiptap-button-text">
                      Add to advanced filter
                    </span>
                  </Button>
                </DropdownMenuItem>
              </Card>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <ConfirmDialog
        open={confirmOpen}
        message="Remove this filter?"
        confirmLabel="Delete filter"
        onCancel={onClose}
        onConfirm={handleDeleteFilter}
      />
    </>
  );
}

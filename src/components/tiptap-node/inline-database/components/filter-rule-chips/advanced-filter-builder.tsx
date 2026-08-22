import type { DatabaseProperty, ID } from "src/types";
import type {
  FilterRule,
  FilterGroup,
  FilterGroupOperator,
} from "src/types/filter-types";
import { FilterRow } from "./filter-row";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Plus, Trash2 } from "lucide-react";
import "./advanced-filter-builder.scss";
import { ConfirmDialog } from "src/components/tiptap-templates/simple/components/confirm-dialog";
import { useCallback, useState } from "react";

export function AdvancedFilterBuilder({
  group,
  rules,
  properties,
  addRule,
  updateRule,
  deleteRule,
  changeProperty,
  setGroupOperator,
  clearRules,
}: {
  group: FilterGroup;
  rules: FilterRule[];
  properties: DatabaseProperty[];
  addRule: () => void;
  updateRule: (id: ID, patch: Partial<FilterRule>) => void;
  deleteRule: (id: ID) => void;
  changeProperty: (id: ID, propertyId: ID) => void;
  setGroupOperator: (op: FilterGroupOperator) => void;
  clearRules: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const onClose = useCallback(() => setConfirmOpen(false), []);
  const handleDeleteFilter = () => clearRules();

  return (
    <>
      <div className="advanced-filter">
        {rules.map((rule, index) => (
          <FilterRow
            key={rule.id}
            rule={rule}
            index={index}
            groupOperator={group.operator}
            properties={properties}
            onChange={(patch) => updateRule(rule.id, patch)}
            onDelete={() => deleteRule(rule.id)}
            onPropertyChange={(propId) => changeProperty(rule.id, propId)}
            onGroupOperatorChange={setGroupOperator}
          />
        ))}

        <Separator
          orientation="horizontal"
          style={{ height: 0.5, margin: "4px 0" }}
        />

        <div className="advanced-filter__footer">
          <Button variant="ghost" onClick={addRule}>
            <Plus className="tiptap-button-icon" />
            <span className="tiptap-button-text">Add filter rule</span>
          </Button>

          <Button
            variant="ghost"
            className="advanced-filter__delete tiptap-delete-button"
            onClick={() => {
              setConfirmOpen(true);
            }}
          >
            <Trash2 size={14} className="tiptap-button-icon" />
            <span className="tiptap-button-text">Delete filter</span>
          </Button>
        </div>
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

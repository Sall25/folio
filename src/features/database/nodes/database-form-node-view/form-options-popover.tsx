import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { DatabaseProperty, SelectOption, StatusGroup } from "src/types";
import { Card } from "src/components/tiptap-ui-primitive/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { SelectOptionsEditor } from "../../ui/select/select-options-editor";
import { StatusEditDisplay } from "../../ui/status/status-edit-display";

/** "Edit options" on a select, multi-select or status question: the same
 *  editors as the property's own menu, in a popover by the button. */
export function FormOptionsPopover({
  property,
  onChange,
}: {
  property: DatabaseProperty;
  onChange: (next: DatabaseProperty) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const config = property.config;
  if (
    config.type !== "select" &&
    config.type !== "multi_select" &&
    config.type !== "status"
  )
    return null;

  const setOptions = (options: SelectOption[]) =>
    onChange({ ...property, config: { ...config, options } as typeof config });
  const setGroups = (groups: StatusGroup[]) =>
    onChange({ ...property, config: { ...config, groups } as typeof config });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="db-form__link-button"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {t("database.form.editOptions")}
          {config.type !== "status" && ` · ${config.options.length}`}
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="db-panel">
        <Card style={{ padding: "6px 8px", minWidth: 260 }}>
          {config.type === "status" ? (
            <StatusEditDisplay groups={config.groups} onChange={setGroups} />
          ) : (
            <SelectOptionsEditor
              options={config.options}
              onEditOption={(option) =>
                setOptions(
                  config.options.map((o) => (o.id === option.id ? option : o)),
                )
              }
              onChange={setOptions}
            />
          )}
        </Card>
      </PopoverContent>
    </Popover>
  );
}

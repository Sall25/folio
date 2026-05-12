import { useState, useCallback, useRef, useMemo } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { v4 as uuid } from "uuid";
import type { SelectOption } from "./select-property-node";
import "./select-property-node-view.scss";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { HIGHLIGHT_COLORS } from "src/components/tiptap-ui/color-highlight-button";
import { SelectOptionsEditor } from "src/components/tiptap-node/inline-database/ui/select/select-options-editor";
import { StatusEditDisplay } from "src/components/tiptap-node/inline-database/ui/status/status-edit-display";
import { PersonEditDisplay } from "src/components/tiptap-node/inline-database/ui/person/person-edit-display";

const TAG_TEXT_COLORS: Record<string, string> = {
  "var(--tt-color-highlight-gray)": "var(--tt-color-text-gray)",
  "var(--tt-color-highlight-brown)": "var(--tt-color-text-brown)",
  "var(--tt-color-highlight-orange)": "var(--tt-color-text-orange)",
  "var(--tt-color-highlight-yellow)": "var(--tt-color-text-yellow)",
  "var(--tt-color-highlight-green)": "var(--tt-color-text-green)",
  "var(--tt-color-highlight-blue)": "var(--tt-color-text-blue)",
  "var(--tt-color-highlight-purple)": "var(--tt-color-text-purple)",
  "var(--tt-color-highlight-pink)": "var(--tt-color-text-pink)",
  "var(--tt-color-highlight-red)": "var(--tt-color-text-red)",
};

function getTagStyle(colorValue: string): React.CSSProperties {
  return {
    background: colorValue,
    color: TAG_TEXT_COLORS[colorValue] ?? "var(--tt-color-text-gray)",
  };
}

export function SelectPropertyNodeView({
  node,
  updateAttributes,
}: NodeViewProps) {
  const { selected, options, nodeId } = node.attrs as {
    selected: SelectOption | null;
    options: SelectOption[];
    nodeId: string;
  };

  const [search, setSearch] = useState("");
  const [draftLabel, setDraftLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const labelRef = useRef<HTMLInputElement>(null);

  const filteredOptions = useMemo(
    () =>
      options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase()),
      ),
    [options, search],
  );

  const handleMainOpenChange = useCallback((open: boolean) => {
    if (open) {
      setSearch("");
      requestAnimationFrame(() => searchRef.current?.focus());
    } else {
      setSearch("");
      setEditingId(null);
    }
  }, []);

  const handleEditOpenChange = useCallback(
    (open: boolean, option: SelectOption) => {
      if (open) {
        setDraftLabel(option.label);
        setEditingId(option.id);
        requestAnimationFrame(() => {
          labelRef.current?.focus();
          labelRef.current?.select();
        });
      } else {
        setEditingId(null);
        setDraftLabel("");
      }
    },
    [],
  );

  const selectOption = useCallback(
    (option: SelectOption) => {
      const isSelected = selected?.id === option.id;
      updateAttributes({ selected: isSelected ? null : option });
    },
    [selected, updateAttributes],
  );

  const addOption = useCallback(() => {
    const label = search.trim() || `Option ${options.length + 1}`;
    const color =
      HIGHLIGHT_COLORS[options.length % HIGHLIGHT_COLORS.length].value;
    const newOption: SelectOption = { id: uuid(), label, color };
    updateAttributes({ options: [...options, newOption], selected: newOption });
    setSearch("");
  }, [search, options, updateAttributes]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (filteredOptions.length === 1) selectOption(filteredOptions[0]);
        else if (filteredOptions.length === 0) addOption();
      }
      if (e.key === "Escape") setSearch("");
    },
    [filteredOptions, selectOption, addOption],
  );

  const updateOption = useCallback(
    (updated: SelectOption) => {
      const newOptions = options.map((o) =>
        o.id === updated.id ? updated : o,
      );
      const newSelected = selected?.id === updated.id ? updated : selected;
      updateAttributes({ options: newOptions, selected: newSelected });
    },
    [options, selected, updateAttributes],
  );

  const commitLabel = useCallback(
    (optionId: string) => {
      const trimmed = draftLabel.trim();
      if (!trimmed) return;
      const option = options.find((o) => o.id === optionId);
      if (!option) return;
      updateOption({ ...option, label: trimmed });
    },
    [draftLabel, options, updateOption],
  );

  const deleteOption = useCallback(
    (optionId: string) => {
      const newOptions = options.filter((o) => o.id !== optionId);
      const newSelected = selected?.id === optionId ? null : selected;
      updateAttributes({ options: newOptions, selected: newSelected });
      setEditingId(null);
    },
    [options, selected, updateAttributes],
  );

  return (
    <NodeViewWrapper
      as="span"
      style={{ display: "inline-flex", position: "relative" }}
      data-node-id={nodeId}
    >
      <Popover onOpenChange={handleMainOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="select-prop__trigger"
            style={selected ? getTagStyle(selected.color) : {}}
          >
            {selected ? selected.label : "Select option..."}
          </Button>
        </PopoverTrigger>

        <PopoverContent side="right" align="center">
          <PersonEditDisplay />
          {/* <StatusEditDisplay onChange={(group) => console.log(group)} /> */}
          {/* <SelectOptionsEditor
            options={options}
            onChange={(options) => updateAttributes({ options })}
            onEditOption={updateOption}
          /> */}
        </PopoverContent>
      </Popover>
    </NodeViewWrapper>
  );
}

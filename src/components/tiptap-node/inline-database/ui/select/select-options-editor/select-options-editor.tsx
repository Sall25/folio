import { useState, useCallback, useRef, useMemo } from "react";
import { ChevronRight, Plus, Trash2 } from "lucide-react";
import { v4 as uuid } from "uuid";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Card,
  CardBody,
  CardGroupLabel,
  CardHeader,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { SortDropdown } from "src/components/tiptap-ui/sort-dropdown";
import { HIGHLIGHT_COLORS } from "src/components/tiptap-ui/color-highlight-button";
import type { SelectOption } from "src/components/tiptap-node/database-node/select-property-node/select-property-node";
import type { SortType } from "../../../../../tiptap-ui/sort-dropdown/sort-dropdown";
import "./select-options-editor.scss";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { ColorHighlightList } from "./color-highlight-list";
import { TextareaAutosize } from "src/components/tiptap-ui-primitive/textarea-auto-size";

const TAG_TEXT_COLORS: Record<string, string> = {
  "var(--tt-color-highlight-gray-contrast)":
    "var(--tt-color-text-gray-contrast)",
  "var(--tt-color-highlight-brown-contrast)":
    "var(--tt-color-text-brown-contrast)",
  "var(--tt-color-highlight-orange-contrast)":
    "var(--tt-color-text-orange-contrast)",
  "var(--tt-color-highlight-yellow-contrast)":
    "var(--tt-color-text-yellow-contrast)",
  "var(--tt-color-highlight-green-contrast)":
    "var(--tt-color-text-green-contrast)",
  "var(--tt-color-highlight-blue-contrast)":
    "var(--tt-color-text-blue-contrast)",
  "var(--tt-color-highlight-purple-contrast)":
    "var(--tt-color-text-purple-contrast)",
  "var(--tt-color-highlight-pink-contrast)":
    "var(--tt-color-text-pink-contrast)",
  "var(--tt-color-highlight-red-contrast)": "var(--tt-color-text-red-contrast)",
};

function getTagStyle(colorValue: string): React.CSSProperties {
  return {
    background: colorValue,
    color: TAG_TEXT_COLORS[colorValue] ?? "var(--tt-color-text-gray)",
  };
}

export interface SelectOptionsEditorProps {
  options: SelectOption[];
  onChange: (options: SelectOption[]) => void;
  onEditOption: (option: SelectOption) => void;
}

export function SelectOptionsEditor({
  options,
  onChange,
  onEditOption,
}: SelectOptionsEditorProps) {
  const [draft, setDraft] = useState("");
  const [sort, setSort] = useState<SortType>("Manual");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [shouldShow, setShouldShow] = useState(false);

  const handleClick = () => setShouldShow(true);
  const handleBlur = () => setShouldShow(false);

  const sortedOptions = useMemo(() => {
    if (sort === "Alphabetical") {
      return [...options].sort((a, b) => a.label.localeCompare(b.label));
    }
    if (sort === "Reverse alphabetical") {
      return [...options].sort((a, b) => b.label.localeCompare(a.label));
    }
    return options;
  }, [options, sort]);

  const addOption = useCallback(() => {
    const label = draft.trim();
    if (!label) return;
    const color =
      HIGHLIGHT_COLORS[options.length % HIGHLIGHT_COLORS.length].value;
    const newOption: SelectOption = { id: uuid(), label, color };
    onChange([...options, newOption]);
    setDraft("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [draft, options, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addOption();
      }
      if (e.key === "Escape") {
        setDraft("");
      }
    },
    [addOption],
  );

  // drag state
  const dragIndex = useRef<number | null>(null);

  const handleDragStart = useCallback((index: number) => {
    dragIndex.current = index;
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (dragIndex.current === null || dragIndex.current === index) return;
      const reordered = [...options];
      const [moved] = reordered.splice(dragIndex.current, 1);
      reordered.splice(index, 0, moved);
      dragIndex.current = index;
      onChange(reordered);
    },
    [options, onChange],
  );

  const handleDragEnd = useCallback(() => {
    dragIndex.current = null;
  }, []);

  const handleColorUpdate = useCallback(
    (id: string, color?: string) => {
      if (!color) return;
      const updated = options.map((option) =>
        option.id !== id ? option : { ...option, color },
      );
      onChange(updated);
    },
    [options, onChange],
  );
  const handleLabelUpdate = (id: string, label: string) => {
    const updated = options.map((o) => (o.id !== id ? o : { ...o, label }));
    onChange(updated);
  };

  return (
    <Card
      style={{
        width: 230,
        padding: "3px 10px",
      }}
    >
      <CardItemGroup>
        <SortDropdown sort={sort} onSelect={(s) => setSort(s as SortType)} />
      </CardItemGroup>

      <Separator orientation="horizontal" />

      {/* options label */}
      <CardItemGroup
        orientation="horizontal"
        style={{
          width: "100%",
          justifyContent: "flex-start",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 12, paddingLeft: 6 }}>Options</span>
        <Spacer orientation="horizontal" />
        <Button variant="ghost" onClick={handleClick} style={{ marginTop: 2 }}>
          <Plus className="tiptap-button-icon" />
        </Button>
      </CardItemGroup>

      {/* new option input */}
      <CardItemGroup
        style={{
          width: "100%",
          justifyContent: "flex-start",
        }}
      >
        {shouldShow && (
          <TextareaAutosize
            maxRows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder="Type a new option..."
            autoFocus
          />
        )}
      </CardItemGroup>

      {/* options list */}
      {sortedOptions.length > 0 && (
        <CardItemGroup
          orientation="vertical"
          style={{
            gap: 1,
            padding: "2px 0",
            justifyContent: "flex-start",
            alignItems: "flex-start",
            width: "100%",
          }}
        >
          {sortedOptions.map((option, index) => (
            <CardItemGroup
              key={option.id}
              draggable={sort === "Manual"}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              style={{ width: "100%" }}
            >
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    aria-label={`Edit ${option.label}`}
                    style={{
                      width: "100%",
                      justifyContent: "flex-start",
                      cursor: "pointer",
                    }}
                    onClick={() => onEditOption(option)}
                  >
                    {/* drag handle — only shown in manual sort */}
                    {sort === "Manual" && (
                      <span className="tiptap-button-icon" aria-hidden>
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                        >
                          <circle cx="4" cy="3" r="1" fill="currentColor" />
                          <circle cx="4" cy="6" r="1" fill="currentColor" />
                          <circle cx="4" cy="9" r="1" fill="currentColor" />
                          <circle cx="8" cy="3" r="1" fill="currentColor" />
                          <circle cx="8" cy="6" r="1" fill="currentColor" />
                          <circle cx="8" cy="9" r="1" fill="currentColor" />
                        </svg>
                      </span>
                    )}

                    {/* tag */}
                    <span
                      className="sel-opts__tag"
                      style={getTagStyle(option.color)}
                    >
                      {option.label}
                    </span>

                    <Spacer orientation="horizontal" />

                    <ChevronRight className="tiptap-button-icon-sub" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent side="top" align="center">
                  <Card
                    style={{
                      padding: "5px 10px",
                      gap: 2,
                      justifyContent: "flex-start",
                      alignItems: "flex-start",
                      minWidth: 220,
                    }}
                  >
                    <CardHeader>
                      <CardItemGroup
                        orientation="vertical"
                        style={{ width: "100%" }}
                      >
                        <TextareaAutosize
                          value={option.label}
                          maxRows={1}
                          onChange={(e) => {
                            if (e.target.value.length > 0) {
                              handleLabelUpdate(option.id, e.target.value);
                            }
                          }}
                          style={{ height: "auto !important" }}
                        />
                        <Button
                          variant="ghost"
                          style={{
                            borderRadius: "var(--tt-radius-sm)",
                            width: "100%",
                            justifyContent: "flex-start",
                          }}
                        >
                          <Trash2 className="tiptap-button-icon" />
                          <span className="tiptap-button-text">
                            Delete option
                          </span>
                        </Button>
                      </CardItemGroup>
                    </CardHeader>
                    <CardBody style={{ padding: 0 }}>
                      <CardGroupLabel>Colors</CardGroupLabel>
                      <ColorHighlightList
                        onAction={(color) =>
                          handleColorUpdate(option.id, color)
                        }
                      />
                    </CardBody>
                  </Card>
                </PopoverContent>
              </Popover>
            </CardItemGroup>
          ))}
        </CardItemGroup>
      )}
    </Card>
  );
}

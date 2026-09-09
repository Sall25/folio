import { useState, useCallback, useRef, useMemo } from "react";
import { Check, ChevronRight, GripVertical, Plus, Trash2 } from "lucide-react";
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
import type { SelectOption } from "src/types";
import type { SortType } from "../../../../../tiptap-ui/sort-dropdown/sort-dropdown";
import "./select-options-editor.scss";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { TextareaAutosize } from "src/components/tiptap-ui-primitive/textarea-auto-size";
import { MenuRow } from "../../../components/menu-row";
import { Input } from "src/components/tiptap-ui-primitive/input";
import { COLOR_OPTIONS } from "../../../components/board-column-menu/utils";

function getTagStyle(colorValue: string): React.CSSProperties {
  return {
    background: `var(--tt-color-highlight-${colorValue})`,
    color: "var(--tt-text-primary)", //TAG_TEXT_COLORS[colorValue] ?? "var(--tt-color-text-gray)",
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
    if (!options) return [];
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
    const color = options
      ? HIGHLIGHT_COLORS[options.length % HIGHLIGHT_COLORS.length].value
      : "yellow";
    const newOption: SelectOption = { id: uuid(), label, color };
    const newOptions = options ? [...options] : [];
    onChange([...newOptions, newOption]);
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
      const reordered = options ? [...options] : [];
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
    <Card style={{ padding: "5px 10px", borderRadius: "var(--tt-radius-sm)" }}>
      <CardItemGroup>
        <SortDropdown sort={sort} onSelect={(s) => setSort(s as SortType)} />
      </CardItemGroup>

      <Separator orientation="horizontal" style={{ height: 0.5 }} />

      {/* options label */}
      <CardItemGroup
        orientation="horizontal"
        style={{
          width: "100%",
          justifyContent: "flex-start",
          alignItems: "center",
        }}
      >
        <CardGroupLabel>Options</CardGroupLabel>
        <Spacer orientation="horizontal" />
        <Button
          variant="ghost"
          size="small"
          onClick={handleClick}
          style={{ marginTop: 5 }}
        >
          <Plus className="tiptap-button-icon" />
        </Button>
      </CardItemGroup>

      <Spacer orientation="vertical" size={5} />

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
      {sortedOptions && sortedOptions.length > 0 && (
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
                    <GripVertical className="tiptap-button-icon" />

                    {/* tag */}
                    <span
                      className="sel-opts__tag tiptap-button-text"
                      style={getTagStyle(option.color)}
                    >
                      {option.label}
                    </span>

                    <Spacer orientation="horizontal" />

                    <ChevronRight className="tiptap-button-icon-sub" />
                  </Button>
                </PopoverTrigger>
                <PopoverPortal>
                  <PopoverContent
                    side="top"
                    align="center"
                    style={{ zIndex: 1000 }}
                  >
                    <Card
                      style={{
                        gap: 2,
                        justifyContent: "flex-start",
                        alignItems: "flex-start",
                        minWidth: 260,
                        borderRadius: "var(--tt-radius-sm)",
                      }}
                    >
                      <CardHeader>
                        <CardItemGroup
                          orientation="vertical"
                          style={{ width: "100%", padding: "5px", gap: 5 }}
                        >
                          <Input
                            value={option.label}
                            onChange={(e) => {
                              if (e.target.value.length > 0) {
                                handleLabelUpdate(option.id, e.target.value);
                              }
                            }}
                            autoFocus
                          />
                          <MenuRow Icon={Trash2} label="Delete option" />
                        </CardItemGroup>
                      </CardHeader>
                      <CardBody
                        style={{
                          padding: "5px 10px",
                          width: "100%",
                          scrollbarWidth: "thin",
                        }}
                      >
                        <CardGroupLabel>Colors</CardGroupLabel>
                        {COLOR_OPTIONS.map((c) => (
                          <Button
                            key={c.id}
                            variant="ghost"
                            className="board-column-menu__item board-column-menu__color"
                            data-active={option.color === c.id || undefined}
                            onClick={() => {
                              handleColorUpdate(option.id, c.id);
                            }}
                          >
                            <span
                              className="select-options-menu__swatch"
                              data-default={c.id === "default" || undefined}
                              style={
                                c.id === "default"
                                  ? undefined
                                  : ({
                                      "--swatch-color": `var(--tt-color-text-${c.id})`,
                                    } as React.CSSProperties)
                              }
                            />
                            <span className="tiptap-button-text">
                              {c.label}
                            </span>
                            {option.color === c.id && (
                              <Check
                                className="select-options-menu__check"
                                size={14}
                              />
                            )}
                          </Button>
                        ))}
                        {/* <ColorHighlightList
                          onAction={(color) =>
                            handleColorUpdate(option.id, color)
                          }
                        /> */}
                      </CardBody>
                    </Card>
                  </PopoverContent>
                </PopoverPortal>
              </Popover>
            </CardItemGroup>
          ))}
        </CardItemGroup>
      )}
    </Card>
  );
}

import {
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { Check, ChevronDown, X } from "lucide-react";
import type { SelectProps, SelectOption, SelectGroup } from "./types";
import "./select.scss";
import { CardItemGroup } from "../card";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";
import { ButtonGroup } from "../button";

// ─────────────────────────────────────────────────────────────────────────────
// Default pill renderer
// ─────────────────────────────────────────────────────────────────────────────

function DefaultPill<T>({
  option,
  onRemove,
}: {
  option: SelectOption<T>;
  onRemove: () => void;
}) {
  return (
    <span
      className="sel-pill"
      style={
        option.color
          ? { background: `${option.color}22`, color: option.color }
          : undefined
      }
    >
      {option.icon && <span className="sel-pill-icon">{option.icon}</span>}
      {option.renderLabel ? option.renderLabel() : option.label}
      <button
        className="sel-pill-remove"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove();
        }}
        aria-label={`Remove ${option.label}`}
      >
        <X style={{ width: 10, height: 10 }} />
      </button>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Default option renderer
// ─────────────────────────────────────────────────────────────────────────────

function DefaultOption<T>({
  option,
  isSelected,
  /*isActive,*/
  /*multiple,*/
}: {
  option: SelectOption<T>;
  isSelected: boolean;
  isActive: boolean;
  multiple: boolean;
}) {
  return (
    <>
      <span className="sel-option-check" aria-hidden>
        {isSelected && <Check style={{ width: 12, height: 12 }} />}
      </span>
      {option.color && (
        <span className="sel-option-dot" style={{ background: option.color }} />
      )}
      {option.icon && <span className="sel-option-icon">{option.icon}</span>}
      <span className="sel-option-label">
        {option.renderLabel ? option.renderLabel() : option.label}
      </span>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Group options by their group key
// ─────────────────────────────────────────────────────────────────────────────

function groupOptions<T>(
  options: SelectOption<T>[],
  groups?: SelectGroup[],
): Array<{ group: SelectGroup | null; options: SelectOption<T>[] }> {
  if (!groups?.length) return [{ group: null, options }];

  const grouped: Record<string, SelectOption<T>[]> = {};
  const ungrouped: SelectOption<T>[] = [];

  for (const opt of options) {
    if (opt.group) {
      grouped[opt.group] = grouped[opt.group] ?? [];
      grouped[opt.group].push(opt);
    } else {
      ungrouped.push(opt);
    }
  }

  const result: Array<{
    group: SelectGroup | null;
    options: SelectOption<T>[];
  }> = [];
  for (const g of groups) {
    if (grouped[g.key]?.length) {
      result.push({ group: g, options: grouped[g.key] });
    }
  }
  if (ungrouped.length) result.push({ group: null, options: ungrouped });
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Select
// ─────────────────────────────────────────────────────────────────────────────

export function Select<T = string>({
  options,
  groups,
  value,
  values = [],
  multiple = false,
  onChange,
  onChangeMultiple,
  onOpenChange,
  placeholder = "Select an option...",
  disabled = false,
  closeOnSelect = true,
  clearable = true,
  showClearButton = true,
  placement = "bottom-start",
  className = "",
  // triggerClassName = "",
  dropdownClassName = "",
  dropdownWidth,
  maxHeight = 240,
  // Render slots
  renderTrigger,
  renderValue,
  renderOption,
  renderEmpty,
  renderFooter,
  renderHeader,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  //  const triggerId = useId();

  // ── Derived ────────────────────────────────────────────────────────────────

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const selectedValues = multiple ? values : value != null ? [value] : [];
  const selectedOptions = options.filter((o) =>
    selectedValues.includes(o.value),
  );
  const hasValue = selectedValues.length > 0;
  //const flatOptions = options.filter((o) => !o.disabled);

  // ── Open/close ─────────────────────────────────────────────────────────────

  const close = useCallback(() => {
    setOpen(false);
    setActiveIndex(0);
    onOpenChange?.(false);
  }, [onOpenChange]);
  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, close]);

  // ── Selection ──────────────────────────────────────────────────────────────
  const selectOption = useCallback(
    (opt: SelectOption<T>) => {
      if (opt.disabled) return;

    
      if (multiple) {
        const isSelected = selectedValues.includes(opt.value);
        const next = isSelected
          ? selectedValues.filter((v) => v !== opt.value)
          : [...selectedValues, opt.value];
        onChangeMultiple?.(next);
      } else {
        const isSelected = value === opt.value;
        onChange?.(clearable && isSelected ? null : opt.value);
        if (closeOnSelect) {
          setOpen(false);
        }
      }
    },
    [
      multiple,
      selectedValues,
      value,
      onChange,
      onChangeMultiple,
      clearable,
      closeOnSelect,
    ],
  );
  const removeOption = useCallback(
    (val: T) => {
      if (multiple) {
        onChangeMultiple?.(selectedValues.filter((v) => v !== val));
      } else {
        onChange?.(null);
      }
    },
    [multiple, selectedValues, onChange, onChangeMultiple],
  );

  const clearAll = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (multiple) onChangeMultiple?.([]);
      else onChange?.(null);
    },
    [multiple, onChange, onChangeMultiple],
  );

  // ── Keyboard navigation ────────────────────────────────────────────────────

  // const handleTriggerKeyDown = useCallback(
  //   (e: KeyboardEvent<HTMLDivElement>) => {
  //     switch (e.key) {
  //       case "Enter":
  //       case " ":
  //         {
  //           e.preventDefault();
  //           if (open) {
  //             selectOption(flatOptions[activeIndex]);
  //           } else {
  //             openDropdown();
  //           }
  //         }
  //         break;
  //       case "ArrowDown":
  //         e.preventDefault();
  //         if (!open) openDropdown();
  //         else setActiveIndex((i) => Math.min(i + 1, flatOptions.length - 1));
  //         break;
  //       case "ArrowUp":
  //         e.preventDefault();
  //         setActiveIndex((i) => Math.max(i - 1, 0));
  //         break;
  //       case "Escape":
  //         close();
  //         break;
  //       case "Tab":
  //         close();
  //         break;
  //     }
  //   },
  //   [open, activeIndex, flatOptions, selectOption, openDropdown, close],
  // );

  // Scroll active item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const active = list.querySelector(
      "[data-active='true']",
    ) as HTMLElement | null;
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  // ── Placement style ────────────────────────────────────────────────────────

  const dropdownStyle: React.CSSProperties = {
    width: dropdownWidth ?? "100%",
    ...(placement.startsWith("top") && {
      bottom: "calc(100% + 4px)",
      top: "auto",
    }),
    ...(placement.endsWith("end") && { right: 0, left: "auto" }),
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const grouped = groupOptions(options, groups);

  // Flat index tracker for keyboard nav across groups
  let flatIndex = 0;

  return (
    <CardItemGroup
      orientation="horizontal"
      ref={rootRef}
      className={`sel-root ${className}`}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <ButtonGroup
            className="trigger-button"
            orientation="horizontal"
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            tabIndex={disabled ? -1 : 0}
          >
            {renderTrigger ? (
              renderTrigger(selectedOptions, open)
            ) : (
              <>
                <div className="sel-trigger-inner">
                  {hasValue ? (
                    selectedOptions.map((opt) =>
                      renderValue ? (
                        <span key={String(opt.value)}>
                          {renderValue(opt, () => removeOption(opt.value))}
                        </span>
                      ) : multiple ? (
                        <DefaultPill
                          key={String(opt.value)}
                          option={opt}
                          onRemove={() => removeOption(opt.value)}
                        />
                      ) : (
                        // Single select — show without remove button in trigger
                        <span
                          key={String(opt.value)}
                          className="sel-single-value"
                          style={opt.color ? { color: opt.color } : undefined}
                        >
                          {opt.icon && (
                            <span className="sel-value-icon">{opt.icon}</span>
                          )}
                          {opt.color && (
                            <span
                              className="sel-value-dot"
                              style={{ background: opt.color }}
                            />
                          )}
                          {opt.renderLabel ? opt.renderLabel() : opt.label}
                        </span>
                      ),
                    )
                  ) : (
                    <span className="sel-placeholder">{placeholder}</span>
                  )}
                </div>

                <div className="sel-trigger-right">
                  {showClearButton && hasValue && (
                    <button
                      className="sel-clear-btn"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        clearAll(e);
                      }}
                      aria-label="Clear selection"
                    >
                      <X style={{ width: 12, height: 12 }} />
                    </button>
                  )}
                  <ChevronDown
                    style={{
                      width: 14,
                      height: 14,
                      flexShrink: 0,
                      transform: open ? "rotate(180deg)" : "none",
                      transition: "transform 0.15s",
                    }}
                    className="sel-chevron"
                  />
                </div>
              </>
            )}
          </ButtonGroup>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="center">
          <div
            className={`sel-dropdown ${dropdownClassName}`}
            style={dropdownStyle}
            role="dialog"
          >
            {renderHeader?.()}

            <ul
              ref={listRef}
              className="sel-list"
              role="listbox"
              aria-multiselectable={multiple}
              style={{ maxHeight }}
            >
              {options.length === 0 ? (
                <li className="sel-empty">
                  {renderEmpty ? renderEmpty() : "No options available"}
                </li>
              ) : (
                grouped.map(({ group, options: groupOpts }) => (
                  <li key={group?.key ?? "__ungrouped"} role="presentation">
                    {group && (
                      <div className="sel-group-label" aria-hidden>
                        {group.label}
                      </div>
                    )}
                    <ul role="group" style={{ listStyle: "none", padding: 0 }}>
                      {groupOpts.map((opt) => {
                        const currentIndex = flatIndex;
                        const isSelected = selectedValues.includes(opt.value);
                        const isActive = currentIndex === activeIndex;
                        if (!opt.disabled) flatIndex++;

                        return (
                          <li
                            key={String(opt.value)}
                            role="option"
                            aria-selected={isSelected}
                            aria-disabled={opt.disabled}
                            data-active={isActive}
                            className={`sel-option
                            ${isSelected ? "sel-option--selected" : ""}
                            ${isActive ? "sel-option--active" : ""}
                            ${opt.disabled ? "sel-option--disabled" : ""}
                          `}
                            onMouseEnter={() =>
                              !opt.disabled && setActiveIndex(currentIndex)
                            }
                            // onMouseDown={(e) => e.preventDefault()}
                            onClick={(e) => {
                              e.stopPropagation();
                              selectOption(opt);
                            }}
                          >
                            {renderOption ? (
                              renderOption(opt, isSelected, isActive)
                            ) : (
                              <DefaultOption
                                option={opt}
                                isSelected={isSelected}
                                isActive={isActive}
                                multiple={multiple}
                              />
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))
              )}
            </ul>

            {renderFooter
              ? renderFooter(selectedOptions, close)
              : multiple &&
                hasValue && (
                  <div className="sel-footer">
                    <button className="sel-done-btn" onClick={close}>
                      Done
                    </button>
                  </div>
                )}
          </div>
        </PopoverContent>
      </Popover>
    </CardItemGroup>
  );
}

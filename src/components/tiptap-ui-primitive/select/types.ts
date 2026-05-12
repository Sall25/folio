import type { ReactNode } from "react";

export interface SelectOption<T = string> {
  value: T;
  label: string;
  /** Optional color dot shown in trigger and list */
  color?: string;
  /** Optional icon rendered before the label */
  icon?: ReactNode;
  /** Render a custom label node instead of the default text */
  renderLabel?: () => ReactNode;
  /** Prevent this option from being selected */
  disabled?: boolean;
  /** Group key — options with the same group are visually grouped */
  group?: string;
}

export interface SelectGroup {
  key: string;
  label: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Render slots — everything the consumer can override
// ─────────────────────────────────────────────────────────────────────────────

export interface SelectRenderSlots<T = string> {
  /** Override the entire trigger content */
  renderTrigger?: (selected: SelectOption<T>[], open: boolean) => ReactNode;
  /** Override how a selected value is shown inside the trigger (single or each pill) */
  renderValue?: (option: SelectOption<T>, onRemove: () => void) => ReactNode;
  /** Override how each option renders in the dropdown */
  renderOption?: (
    option: SelectOption<T>,
    isSelected: boolean,
    isActive: boolean,
  ) => ReactNode;
  /** Render a custom empty state */
  renderEmpty?: () => ReactNode;
  /** Render a custom footer inside the dropdown */
  renderFooter?: (selected: SelectOption<T>[], close: () => void) => ReactNode;
  /** Render a header above the options list */
  renderHeader?: () => ReactNode;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main props
// ─────────────────────────────────────────────────────────────────────────────

export interface SelectProps<T = string> extends SelectRenderSlots<T> {
  options: SelectOption<T>[];
  /** Named groups — defines label + order */
  groups?: SelectGroup[];

  // ── Controlled value ──────────────────────────────────────────────────────
  /** Single select value */
  value?: T | null;
  /** Multi select values */
  values?: T[];
  /** Toggle single / multi */
  multiple?: boolean;

  // ── Callbacks ─────────────────────────────────────────────────────────────
  onChange?: (value: T | null) => void;
  onChangeMultiple?: (values: T[]) => void;
  /** Called when dropdown opens/closes */
  onOpenChange?: (open: boolean) => void;

  // ── Behaviour ─────────────────────────────────────────────────────────────
  placeholder?: string;
  disabled?: boolean;
  /** Close the dropdown after selecting in single mode (default: true) */
  closeOnSelect?: boolean;
  /** Allow deselecting the current value in single mode (default: true) */
  clearable?: boolean;
  /** Show a clear-all button in the trigger when values are selected */
  showClearButton?: boolean;
  /** Placement of the dropdown */
  placement?: "bottom-start" | "bottom-end" | "top-start" | "top-end";

  // ── Appearance ────────────────────────────────────────────────────────────
  className?: string;
  triggerClassName?: string;
  dropdownClassName?: string;
  /** Width of the dropdown. Defaults to match trigger width */
  dropdownWidth?: number | string;
  /** Max height of the options list */
  maxHeight?: number;
}

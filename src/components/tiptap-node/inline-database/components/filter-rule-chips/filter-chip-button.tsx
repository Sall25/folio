import { ChevronDown } from "lucide-react";
import { forwardRef } from "react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { DynamicIcon } from "src/components/tiptap-ui/cover/dynamic-icon";
import { type DatabaseProperty, type FilterRule } from "src/types";
import { PROPERTY_TYPE_ICONS } from "src/types/property-type-meta";

export const FilterChipButton = forwardRef<
  HTMLButtonElement,
  {
    count: number;
    locked: boolean;
    property?: DatabaseProperty;
    rule?: FilterRule;
    advanced?: boolean;
  } & Omit<
    React.ComponentProps<typeof Button>,
    "count" | "locked" | "property" | "rule" | "advanced"
  >
>(({ locked, property, rule, count, advanced = false, ...props }, ref) => {
  const hasOptions =
    rule?.propertyType === "select" ||
    rule?.propertyType === "multi_select" ||
    rule?.propertyType === "status";
  const iconName = PROPERTY_TYPE_ICONS[rule?.propertyType ?? "text"];
  const propName = property?.name ?? "Property";
  const value = rule?.value;
  const labels = hasOptions ? (rule.labels ?? []) : [];

  return (
    <Button
      ref={ref}
      {...props}
      variant="ghost"
      style={{
        padding: "0 8px",
        minHeight: 26,
        height: 26,
        gap: 5,
        borderRadius: "var(--tt-radius-xl)",
        color: "var(--tt-brand-color-300)",
        background:
          "color-mix(in srgb, var(--tt-brand-color-300) 14%, transparent)",
        cursor: locked ? "default" : undefined,
      }}
    >
      <DynamicIcon
        name={iconName}
        className="tiptap-button-icon"
        size={18}
        style={{ color: "inherit" }}
        weight={200}
      />
      <span className="tiptap-button-text">
        {!advanced && (
          <>
            <b>{propName}</b> {": "}{" "}
          </>
        )}
        {advanced
          ? `${count} ${count > 1 ? "rules" : "rule"}`
          : hasOptions
            ? labels.length > 0
              ? labels.join(", ")
              : "Any"
            : value}
      </span>

      {!locked && (
        <ChevronDown
          size={11}
          className="tiptap-button-icon-sub"
          style={{ color: "inherit" }}
        />
      )}
    </Button>
  );
});

FilterChipButton.displayName = "FilterChipButton";

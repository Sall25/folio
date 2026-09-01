import * as React from "react";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "src/components/tiptap-ui-primitive/tooltip";
import "./input.scss";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  /** Tooltip text on the info icon. */
  description?: string;
  /** Show the info icon. Defaults to true when there's a description OR an
   *  onInfoClick handler — so the header can surface it as an "add
   *  description" affordance even before any text exists. */
  showInfo?: boolean;
  /** When provided, the info icon becomes clickable and fires this — e.g. to
   *  open the description editor in the property header. */
  onInfoClick?: () => void;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", description, showInfo, onInfoClick, ...props }, ref) => {
    const input = (
      <input
        ref={ref}
        className={`tiptap-input ${className}`.trim()}
        {...props}
      />
    );

    // Icon shows when explicitly enabled, or (by default) whenever there's a
    // description to read or a click handler to fire. No description, no
    // handler, showInfo unset → render exactly as before (bare input).
    const shouldShow = showInfo ?? (!!description || !!onInfoClick);
    if (!shouldShow) return input;

    const clickable = !!onInfoClick;

    const icon = (
      <span
        className="tiptap-input__info"
        role={clickable ? "button" : "img"}
        aria-label={description || "Description"}
        tabIndex={0}
        data-clickable={clickable || undefined}
        onClick={
          clickable
            ? (e) => {
                e.preventDefault();
                e.stopPropagation();
                onInfoClick!();
              }
            : undefined
        }
        onKeyDown={
          clickable
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onInfoClick!();
                }
              }
            : undefined
        }
      >
        <Info size={15} />
      </span>
    );

    return (
      <div className="tiptap-input-wrap">
        {input}
        {/* Only wrap in a tooltip when there's text to show. A click-only icon
            with no description shows no tooltip. */}
        {description ? (
          <Tooltip>
            <TooltipTrigger asChild>{icon}</TooltipTrigger>
            <TooltipContent>{description}</TooltipContent>
          </Tooltip>
        ) : (
          icon
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

type InputGroupProps = React.HTMLAttributes<HTMLDivElement>;

export const InputGroup = React.forwardRef<HTMLDivElement, InputGroupProps>(
  ({ className = "", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`tiptap-input-group ${className}`.trim()}
        {...props}
      >
        {children}
      </div>
    );
  },
);

InputGroup.displayName = "InputGroup";

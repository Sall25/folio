import { forwardRef, useMemo, useRef, useState } from "react";
import { type Editor } from "@tiptap/react";

// --- Hooks ---
import { useMenuNavigation } from "src/hooks/use-menu-navigation";
import { useIsBreakpoint } from "src/hooks/use-is-breakpoint";
import { useTiptapEditor } from "src/hooks/use-tiptap-editor";

// --- Icons ---
import { BanIcon } from "src/components/tiptap-icons/ban-icon";
import { Paintbrush as TextIcon } from "lucide-react";

// --- UI Primitives ---
import type { ButtonProps } from "src/components/tiptap-ui-primitive/button";
import { Button, ButtonGroup } from "src/components/tiptap-ui-primitive/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "src/components/tiptap-ui-primitive/popover";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import {
  Card,
  CardBody,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";

// --- Tiptap UI ---
import type {
  TextColor,
  UseColorTextConfig,
} from "../color-text-button/use-color-text";
import {
  pickTextColorsByValue,
  useColorText,
} from "../color-text-button/use-color-text";

import { ColorTextButton } from "src/components/tiptap-ui/color-text-button";

export interface ColorTextPopoverContentProps {
  /**
   * The Tiptap editor instance.
   */
  editor?: Editor | null;
  /**
   * Optional colors to use in the text popover.
   * If not provided, defaults to a predefined set of colors.
   */
  colors?: TextColor[];
  /**
   * When true, uses the actual color value (colorValue) instead of CSS variable (value).
   * @default false
   */
  useColorValue?: boolean;
}

export interface ColortextPopoverProps
  extends
    Omit<ButtonProps, "type">,
    Pick<UseColorTextConfig, "editor" | "hideWhenUnavailable" | "onApplied"> {
  /**
   * Optional colors to use in the text popover.
   * If not provided, defaults to a predefined set of colors.
   */
  colors?: TextColor[];
  /**
   * When true, uses the actual color value (colorValue) instead of CSS variable (value).
   * @default false
   */
  useColorValue?: boolean;
}

export const ColorTextPopoverButton = forwardRef<
  HTMLButtonElement,
  ButtonProps
>(({ className, children, ...props }, ref) => (
  <Button
    type="button"
    className={className}
    variant="ghost"
    data-appearance="default"
    role="button"
    tabIndex={-1}
    aria-label="color text"
    tooltip="text"
    ref={ref}
    {...props}
  >
    {children ?? <TextIcon className="tiptap-button-icon" />}
  </Button>
));

ColorTextPopoverButton.displayName = "ColorTextPopoverButton";

export function ColorTextPopoverContent({
  editor,
  colors = pickTextColorsByValue([
    "var(--tt-color-text-green)",
    "var(--tt-color-text-blue)",
    "var(--tt-color-text-red)",
    "var(--tt-color-text-purple)",
    "var(--tt-color-text-yellow)",
    "var(--tt-color-text-lime)",
    "var(--tt-color-text-mint)",
    "var(--tt-color-text-teal)",
    "var(--tt-color-text-cyan)",
    "var(--tt-color-text-slate)",
    "var(--tt-color-text-indigo)",
    "var(--tt-color-text-violet)",
    "var(--tt-color-text-magenta)",
    "var(--tt-color-text-rose)",
  ]),
  useColorValue = false,
}: ColorTextPopoverContentProps) {
  const { handleRemovetext } = useColorText({ editor });
  const isMobile = useIsBreakpoint();
  const containerRef = useRef<HTMLDivElement>(null);

  const menuItems = useMemo(
    () => [...colors, { label: "Remove text", value: "none" }],
    [colors],
  );

  const { selectedIndex } = useMenuNavigation({
    containerRef,
    items: menuItems,
    orientation: "both",
    onSelect: (item) => {
      if (!containerRef.current) return false;
      const textedElement = containerRef.current.querySelector(
        '[data-texted="true"]',
      ) as HTMLElement;
      if (textedElement) textedElement.click();
      if (item.value === "none") handleRemovetext();
      return true;
    },
    autoSelectFirstItem: false,
  });

  return (
    <Card
      ref={containerRef}
      tabIndex={0}
      style={isMobile ? { boxShadow: "none", border: 0 } : {}}
    >
      <CardBody style={isMobile ? { padding: 0 } : {}}>
        <CardItemGroup orientation="horizontal">
          <ButtonGroup
            orientation="horizontal"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 4,
              maxWidth: 240,
            }}
          >
            {colors.map((color, index) => (
              <ColorTextButton
                key={color.value}
                editor={editor}
                textColor={useColorValue ? color.colorValue : color.value}
                tooltip={color.label}
                aria-label={`${color.label} text color`}
                tabIndex={index === selectedIndex ? 0 : -1}
                data-texted={selectedIndex === index}
                useColorValue={useColorValue}
              />
            ))}
            <Separator />
            <Button
              onClick={handleRemovetext}
              aria-label="Remove text"
              tooltip="Remove text"
              tabIndex={selectedIndex === colors.length ? 0 : -1}
              type="button"
              role="menuitem"
              variant="ghost"
              data-texted={selectedIndex === colors.length}
            >
              <BanIcon className="tiptap-button-icon" />
            </Button>
          </ButtonGroup>
        </CardItemGroup>
      </CardBody>
    </Card>
  );
}

export function ColorTextPopover({
  editor: providedEditor,
  colors = pickTextColorsByValue([
    "var(--tt-color-text-green)",
    "var(--tt-color-text-blue)",
    "var(--tt-color-text-red)",
    "var(--tt-color-text-purple)",
    "var(--tt-color-text-yellow)",
    "var(--tt-color-text-lime)",
    "var(--tt-color-text-mint)",
    "var(--tt-color-text-teal)",
    "var(--tt-color-text-cyan)",
    "var(--tt-color-text-slate)",
    "var(--tt-color-text-indigo)",
    "var(--tt-color-text-violet)",
    "var(--tt-color-text-magenta)",
    "var(--tt-color-text-rose)",
  ]),
  hideWhenUnavailable = false,
  useColorValue = false,
  onApplied,
  ...props
}: ColortextPopoverProps) {
  const { editor } = useTiptapEditor(providedEditor);
  const [isOpen, setIsOpen] = useState(false);
  const { isVisible, canColortext, isActive, label, Icon } = useColorText({
    editor,
    hideWhenUnavailable,
    onApplied,
  });

  if (!isVisible) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <ColorTextPopoverButton
          disabled={!canColortext}
          data-active-state={isActive ? "on" : "off"}
          data-disabled={!canColortext}
          aria-pressed={isActive}
          aria-label={label}
          tooltip={label}
          {...props}
        >
          <Icon className="tiptap-button-icon" />
        </ColorTextPopoverButton>
      </PopoverTrigger>
      <PopoverContent aria-label="text colors">
        <ColorTextPopoverContent
          editor={editor}
          colors={colors}
          useColorValue={useColorValue}
        />
      </PopoverContent>
    </Popover>
  );
}

export default ColorTextPopover;

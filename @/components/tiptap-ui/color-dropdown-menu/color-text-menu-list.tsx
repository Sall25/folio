import {
  ColorTextButton,
  pickTextColorsByValue,
  useColorText,
  type TextColor,
  type UseColorTextConfig,
} from "@/components/tiptap-ui/color-text-button";
import { useMemo, useRef } from "react";
import { useMenuNavigation } from "@/hooks/use-menu-navigation";
import { Button, ButtonGroup } from "@/components/tiptap-ui-primitive/button";
import { useColorDropdownContext } from "./use-color-dropdown-context";
import { BanIcon } from "lucide-react";
import { DropdownMenuItem } from "@/components/tiptap-ui-primitive/dropdown-menu";

export interface ColorTextMenuListProps extends Pick<
  UseColorTextConfig,
  "editor"
> {
  colors?: TextColor[];
  useColorValue?: boolean;
  onAction?: () => void;
}

export function ColorTextMenuList({
  editor,
  colors = pickTextColorsByValue([
    "var(--tt-color-text-green)",
    "var(--tt-color-text-blue)",
    "var(--tt-color-text-red)",
    "var(--tt-color-text-purple)",
    "var(--tt-color-text-yellow)",
  ]),
  useColorValue = false,
  onAction,
}: ColorTextMenuListProps) {
  const { handleRemovetext } = useColorText({ editor, mode: "node" });
  const containerRef = useRef<HTMLDivElement>(null);

  const menuItems = useMemo(
    () => [...colors, { label: "Remove text", value: "none" }],
    [colors],
  );

  const { selectedIndex } = useMenuNavigation({
    containerRef,
    items: menuItems,
    onSelect: (item) => {
      if (!containerRef.current) return false;
      const textedElement = containerRef.current.querySelector(
        '[data-highlighted="true"]',
      ) as HTMLElement;
      if (textedElement) textedElement.click();
      if (item.value === "none") handleRemovetext();
      return true;
    },
    autoSelectFirstItem: false,
  });

  const { addRecentColor } = useColorDropdownContext();

  return (
    <ButtonGroup orientation="vertical">
      {colors.map((color, index) => (
        <DropdownMenuItem key={index} asChild>
          <ColorTextButton
            role="menuitem"
            showTooltip={false}
            editor={editor}
            textColor={useColorValue ? color.colorValue : color.value}
            // tabIndex={index === selectedIndex ? 0 : -1}
            data-highlighted={selectedIndex === index}
            useColorValue={useColorValue}
            text={color.label}
            onClick={() => {
              editor?.commands.toggleNodeColor(color.value);
              addRecentColor({
                color: color.value,
                label: color.label,
                type: "text",
              });
              console.log("applied");
              onAction?.();
            }}
            disabled={false}
            data-disabled={false}
            mode={"node"}
          />
        </DropdownMenuItem>
      ))}
      <DropdownMenuItem asChild>
        <Button
          onClick={handleRemovetext}
          aria-label="Remove color"
          tabIndex={selectedIndex === colors.length ? 0 : -1}
          type="button"
          role="menuitem"
          variant="ghost"
          data-highlighted={selectedIndex === colors.length}
          className="color-text-button"
        >
          <BanIcon className="tiptap-button-icon" />
          <span>Remove color</span>
        </Button>
      </DropdownMenuItem>
    </ButtonGroup>
  );
}

import {
  ColorTextButton,
  pickTextColorsByValue,
  useColorText,
  type TextColor,
  type UseColorTextConfig,
} from "src/components/tiptap-ui/color-text-button";
import { useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useMenuNavigation } from "src/hooks/use-menu-navigation";
import { Button, ButtonGroup } from "src/components/tiptap-ui-primitive/button";
import { useColorDropdownContext } from "./use-color-dropdown-context";
import { BanIcon } from "lucide-react";
import { DropdownMenuItem } from "src/components/tiptap-ui-primitive/dropdown-menu";

// Derive an i18n key from the color's CSS variable, e.g.
// "var(--tt-color-text-green)" -> "colors.texts.green". Returns null if the
// value isn't one of the named text-color vars (then we fall back to label).
function textColorLabelKey(value: string): string | null {
  const m = value.match(/--tt-color-text-([a-z]+)/);
  return m ? `colors.texts.${m[1]}` : null;
}

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
  const { t } = useTranslation();
  const { handleRemovetext } = useColorText({ editor, mode: "node" });
  const containerRef = useRef<HTMLDivElement>(null);

  const menuItems = useMemo(
    () => [...colors, { label: t("colors.removeColor"), value: "none" }],
    [colors, t],
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
      onAction?.();
      return true;
    },
    autoSelectFirstItem: false,
  });

  const { addRecentColor } = useColorDropdownContext();

  return (
    <ButtonGroup orientation="vertical">
      {colors.map((color, index) => {
        const key = textColorLabelKey(color.value);
        const label = key ? t(key, { defaultValue: color.label }) : color.label;
        return (
          <DropdownMenuItem key={index} asChild>
            <ColorTextButton
              role="menuitem"
              showTooltip={false}
              editor={editor}
              textColor={useColorValue ? color.colorValue : color.value}
              // tabIndex={index === selectedIndex ? 0 : -1}
              data-highlighted={selectedIndex === index}
              useColorValue={useColorValue}
              text={label}
              onClick={() => {
                editor?.commands.toggleNodeColor(color.value);
                addRecentColor({
                  color: color.value,
                  label,
                  type: "text",
                });

                onAction?.();
              }}
              disabled={false}
              data-disabled={false}
              mode={"node"}
            />
          </DropdownMenuItem>
        );
      })}
      <DropdownMenuItem asChild>
        <Button
          onClick={handleRemovetext}
          aria-label={t("colors.removeColor")}
          tabIndex={selectedIndex === colors.length ? 0 : -1}
          type="button"
          role="menuitem"
          variant="ghost"
          data-highlighted={selectedIndex === colors.length}
          className="color-text-button"
        >
          <BanIcon className="tiptap-button-icon" />
          <span>{t("colors.removeColor")}</span>
        </Button>
      </DropdownMenuItem>
    </ButtonGroup>
  );
}

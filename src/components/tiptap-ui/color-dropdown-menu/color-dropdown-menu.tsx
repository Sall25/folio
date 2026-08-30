import type { Editor } from "@tiptap/core";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "src/components/tiptap-ui-primitive/dropdown-menu";
import {
  Card,
  CardGroupLabel,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import { useTiptapEditor } from "src/hooks/use-tiptap-editor";
import { ColorTextMenuList } from "./color-text-menu-list";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { ColorRecentMenuList } from "./color-recent-menu-list";
import { ColorHighlightMenuList } from "./color-highlight-menu-list";
import { useColorDropdown } from "./use-color-dropdown";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { ChevronRight, PaintBucket } from "lucide-react";

import "./color-dropdown-menu.scss";
import { useHoverMenu } from "./useHoverMenu";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { useRef, type Ref } from "react";
import { useTranslation } from "react-i18next";
import { useColorDropdownContext } from "./use-color-dropdown-context";

interface ColorDropdownMenuProps {
  editor?: Editor | null;
  allowedBlockTypes?: string[];
  hideWhenUnavailable?: boolean;
  onAction?: () => void;
  className?: string;
}

export default function ColorDropdownMenu({
  editor: providedEditor,
  allowedBlockTypes = [
    "paragraph",
    "heading",
    "bulletList",
    "orderedList",
    "taskList",
    "blockquote",
    "table",
    "tableCell",
    "tableHeader",
    "callout",
    "ctaButton",
    "container",
  ],
  hideWhenUnavailable,
  onAction,
  className,
}: ColorDropdownMenuProps) {
  const { t } = useTranslation();
  const { editor } = useTiptapEditor(providedEditor);
  const { isVisible } = useColorDropdown({
    editor,
    blockTypes: allowedBlockTypes,
    hideWhenUnavailable,
  });
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const { open, setOpen, handleMouseEnter, handleMouseLeave, containerRef } =
    useHoverMenu(50);

  const { recentColors } = useColorDropdownContext();

  if (hideWhenUnavailable && !isVisible) return null;
  if (!editor) return null;

  return (
    <div
      ref={containerRef as Ref<HTMLDivElement>}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        width: "100%",
      }}
    >
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger ref={triggerRef} asChild>
          <Button className={className} role="menuitem" variant="ghost">
            <PaintBucket className="tiptap-button-icon" />
            <span className="tiptap-button-text">{t("colors.label")}</span>
            <Spacer orientation="horizontal" />
            <ChevronRight className="tiptap-button-icon chevron" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          side="right"
          align="center"
          className="color-menu-content"
        >
          <Card
            style={{
              alignItems: "flex-start",
              padding: "5px 10px",
            }}
          >
            <CardItemGroup
              style={{
                width: "100%",
              }}
            >
              {recentColors.length !== 0 && (
                <>
                  <CardItemGroup>
                    <DropdownMenuItem>
                      <CardGroupLabel>{t("colors.recent")}</CardGroupLabel>
                    </DropdownMenuItem>
                    <ColorRecentMenuList editor={editor} />
                  </CardItemGroup>

                  <Separator orientation="horizontal" />
                </>
              )}

              <CardItemGroup>
                <CardGroupLabel>{t("colors.label")}</CardGroupLabel>
                <ColorTextMenuList
                  editor={editor}
                  onAction={() => {
                    onAction?.();
                  }}
                />
              </CardItemGroup>
            </CardItemGroup>

            <Separator orientation="horizontal" />

            <CardItemGroup style={{ width: "100%" }}>
              <CardGroupLabel>{t("colors.background")}</CardGroupLabel>
              <ColorHighlightMenuList
                editor={editor}
                onAction={() => {
                  // closeImmediately();
                  onAction?.();
                }}
              />
            </CardItemGroup>
          </Card>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

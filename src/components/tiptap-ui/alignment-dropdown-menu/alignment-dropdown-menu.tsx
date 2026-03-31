import type { Editor } from "@tiptap/core";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "src/components/tiptap-ui-primitive/dropdown-menu";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { useTiptapEditor } from "src/hooks/use-tiptap-editor";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { useHoverMenu } from "src/components/tiptap-ui/color-dropdown-menu/useHoverMenu";
import { useAlignmentDropdown } from "./use-alignment-dropdown";
import { AlignmentIcon } from "src/components/tiptap-icons";
import { ChevronRight } from "lucide-react";

import "./alignment-dropdown-menu.scss";
import {
  AlignBottomIcon,
  AlignCenterIcon,
  AlignLeftIcon,
  AlignMiddleIcon,
  AlignRightIcon,
  AlignTopIcon,
} from "src/components/tiptap-icons";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import type { Ref } from "react";
import { useEditorState } from "@tiptap/react";
import { isAligned } from "./use-alignment-active";

interface AlignmentDropdownMenuProps {
  editor?: Editor | null;
  allowedBlockTypes?: string[];
  hideWhenUnavailable?: boolean;
  onAction?: () => void;
  className?: string;
}

export default function AlignmentDropdownMenu({
  editor: providedEditor,
  allowedBlockTypes = ["table", "tableHeader", "tableCell", "tableRow"],
  hideWhenUnavailable,
  onAction,
  className,
}: AlignmentDropdownMenuProps) {
  const { editor } = useTiptapEditor(providedEditor);
  const { isVisible } = useAlignmentDropdown({
    editor,
    blockTypes: allowedBlockTypes,
    hideWhenUnavailable,
  });

  const { open, setOpen, handleMouseEnter, handleMouseLeave, containerRef } =
    useHoverMenu(50);

  // inside the component
  const alignState = useEditorState({
    editor,
    selector: (ctx) => ({
      left: isAligned(ctx.editor!, "left"),
      center: isAligned(ctx.editor!, "center"),
      right: isAligned(ctx.editor!, "right"),
      top: isAligned(ctx.editor!, "top"),
      middle: isAligned(ctx.editor!, "middle"),
      bottom: isAligned(ctx.editor!, "bottom"),
    }),
  });

  if (!editor) return null;

  if (hideWhenUnavailable && !isVisible) return null;

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
        <DropdownMenuTrigger asChild>
          <Button className={className} role="menuitem" variant="ghost">
            <AlignmentIcon className="tiptap-button-icon" />
            <span>Alignments</span>
            <Spacer orientation="horizontal" />
            <ChevronRight className="tiptap-button-icon chevron" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          side="right"
          align="center"
          className="alignment-menu-content"
        >
          <Card
            style={{
              alignItems: "center",
              padding: "5px 10px",
            }}
          >
            <CardItemGroup>
              <CardItemGroup>
                <DropdownMenuItem className="menu-item" asChild>
                  <Button
                    role="menuitem"
                    variant="ghost"
                    data-active-state={alignState?.left ? "on" : "off"}
                    onClick={() => {
                      editor.commands.align("left");
                      onAction?.();
                    }}
                  >
                    <AlignLeftIcon className="tiptap-button-icon" />
                    <span> Align left</span>
                  </Button>
                </DropdownMenuItem>
                <DropdownMenuItem className="menu-item" asChild>
                  <Button
                    variant="ghost"
                    data-active-state={alignState?.center ? "on" : "off"}
                    onClick={() => {
                      editor.commands.align("center");
                      onAction?.();
                    }}
                  >
                    <AlignCenterIcon className="tiptap-button-icon" />
                    <span>Align center</span>
                  </Button>
                </DropdownMenuItem>
                <DropdownMenuItem className="menu-item" asChild>
                  <Button
                    variant="ghost"
                    data-active-state={alignState?.right ? "on" : "off"}
                    onClick={() => {
                      editor.commands.align("right");
                      onAction?.();
                    }}
                  >
                    <AlignRightIcon className="tiptap-button-icon" />
                    <span> Align right</span>
                  </Button>
                </DropdownMenuItem>
              </CardItemGroup>

              <Separator orientation="horizontal" />

              <CardItemGroup>
                <DropdownMenuItem className="menu-item" asChild>
                  <Button
                    variant="ghost"
                    data-active-state={alignState?.top ? "on" : "off"}
                    onClick={() => {
                      editor.commands.align("top");
                      onAction?.();
                    }}
                  >
                    <AlignTopIcon className="tiptap-button-icon" />
                    <span>Align top</span>
                  </Button>
                </DropdownMenuItem>
                <DropdownMenuItem className="menu-item" asChild>
                  <Button
                    variant="ghost"
                    data-active-state={alignState?.middle ? "on" : "off"}
                    onClick={() => {
                      editor.commands.align("middle");
                      onAction?.();
                    }}
                  >
                    <AlignMiddleIcon className="tiptap-button-icon" />
                    <span>Align middle</span>
                  </Button>
                </DropdownMenuItem>
                <DropdownMenuItem className="menu-item" asChild>
                  <Button
                    variant="ghost"
                    data-active-state={alignState?.bottom ? "on" : "off"}
                    onClick={() => {
                      editor.commands.align("bottom");
                      onAction?.();
                    }}
                  >
                    <AlignBottomIcon className="tiptap-button-icon" />
                    <span>Align bottom</span>
                  </Button>
                </DropdownMenuItem>
              </CardItemGroup>
            </CardItemGroup>
          </Card>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

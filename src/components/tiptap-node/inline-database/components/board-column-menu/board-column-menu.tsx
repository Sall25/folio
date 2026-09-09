import { Ellipsis, LayoutGrid, EyeOff, Trash2, Check } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import "./board-column-menu.scss";
import type { ID } from "src/types";
import { COLOR_OPTIONS } from "./utils";

export function BoardColumnMenu({
  columnId,
  columnColor,
  onEditGroups,
  onToggleAggregation,
  onHideGroup,
  onMoveToTrash,
  onSetColor,
  aggregationHidden,
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  columnId: ID;
  columnColor?: string | null;
  onEditGroups?: () => void;
  onToggleAggregation?: () => void;
  onHideGroup?: (columnId: ID) => void;
  onMoveToTrash?: () => void;
  onSetColor?: (columnId: ID, color: string) => void;
  aggregationHidden?: boolean;
}) {
  if (!open) {
    return (
      <Button
        variant="ghost"
        className="db-board-col-header__menu-btn"
        tooltip="Column options"
        onClick={() => setOpen(true)}
      >
        <Ellipsis className="tiptap-button-icon" size={14} />
      </Button>
    );
  }

  const close = () => setOpen(false);

  return (
    <Popover open onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="db-board-col-header__menu-btn">
          <Ellipsis className="tiptap-button-icon" size={14} />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        // align="center"
        avoidCollisions
        collisionPadding={8}
        // sideOffset={6}
      >
        <Card
          className="board-column-menu"
          style={{ padding: 4, minWidth: 200 }}
        >
          {/* ── Actions ── */}
          <CardItemGroup style={{ width: "100%" }}>
            <Button
              variant="ghost"
              className="board-column-menu__item"
              onClick={() => {
                onEditGroups?.();
                close();
              }}
            >
              <LayoutGrid className="tiptap-button-icon" size={16} />
              <span className="tiptap-button-text">Edit groups</span>
            </Button>

            <Button
              variant="ghost"
              className="board-column-menu__item"
              onClick={() => {
                onToggleAggregation?.();
                close();
              }}
            >
              <EyeOff className="tiptap-button-icon" size={16} />
              <span className="tiptap-button-text">
                {aggregationHidden ? "Show aggregation" : "Hide aggregation"}
              </span>
            </Button>

            <Button
              variant="ghost"
              className="board-column-menu__item"
              onClick={() => {
                onHideGroup?.(columnId);
                close();
              }}
            >
              <EyeOff className="tiptap-button-icon" size={16} />
              <span className="tiptap-button-text">Hide group</span>
            </Button>

            <Button
              variant="ghost"
              className="tiptap-button-delete"
              onClick={() => {
                onMoveToTrash?.();
                close();
              }}
            >
              <Trash2 className="tiptap-button-icon" size={16} />
              <span className="tiptap-button-text">Move to Trash</span>
            </Button>
          </CardItemGroup>

          <Separator orientation="horizontal" style={{ margin: "6px 0" }} />

          {/* ── Colors ── */}
          <div className="board-column-menu__section-label">Colors</div>
          <CardItemGroup style={{ width: "100%" }}>
            {COLOR_OPTIONS.map((c) => {
              const active = (columnColor ?? "default") === c.id;
              return (
                <Button
                  key={c.id}
                  variant="ghost"
                  className="board-column-menu__item board-column-menu__color"
                  data-active={active || undefined}
                  onClick={() => {
                    onSetColor?.(columnId, c.id);
                    close();
                  }}
                >
                  <span
                    className="board-column-menu__swatch"
                    data-default={c.id === "default" || undefined}
                    style={
                      c.id === "default"
                        ? undefined
                        : ({
                            "--swatch-color": `var(--tt-color-text-${c.id})`,
                          } as React.CSSProperties)
                    }
                  />
                  <span className="tiptap-button-text">{c.label}</span>
                  {active && (
                    <Check className="board-column-menu__check" size={14} />
                  )}
                </Button>
              );
            })}
          </CardItemGroup>
        </Card>
      </PopoverContent>
    </Popover>
  );
}

import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import { createIcon } from "src/components/icons";
import { MenuRow } from "src/features/database/components/menu-row";
import { NavigableMenuItem } from "src/features/database/components/navigable-menu-item";
import { pinMenuTarget } from "./pin-menu-target";
import "./pins.scss";

// The block menu's "Pin" row, for blocks that can be pinned: a flyout with
// Pin to side, Pin to top (the Pomodoro, as a chip) and Unpin everywhere.

const PinIcon = createIcon("PinKeep", "keep");
const SideIcon = createIcon("PinSide", "right_panel_open");
const TopIcon = createIcon("PinTop", "top_panel_open");
const UnpinIcon = createIcon("PinOff", "keep_off");

/** Blocks with a top-bar version. */
const TOP_TYPES = new Set(["pomodoro"]);

function setPins(
  editor: Editor,
  pos: number,
  pins: { pinSide?: boolean; pinTop?: boolean },
) {
  editor
    .chain()
    .command(({ tr }) => {
      for (const [key, value] of Object.entries(pins)) {
        tr.setNodeAttribute(pos, key, value);
      }
      return true;
    })
    .run();
}

export function PinMenuActions({
  editor,
  onAction,
}: {
  editor: Editor;
  onAction?: () => void;
}) {
  const { t } = useTranslation();
  const target = useEditorState({
    editor,
    selector: ({ editor: e }) => (e ? pinMenuTarget(e) : null),
  });
  if (!target) return null;

  const { node, pos } = target;
  const side = !!node.attrs.pinSide;
  const top = !!node.attrs.pinTop;
  const hasTop = TOP_TYPES.has(node.type.name);
  const sub =
    side && top
      ? t("pins.subBoth")
      : side
        ? t("pins.subSide")
        : top
          ? t("pins.subTop")
          : undefined;

  return (
    <NavigableMenuItem
      Icon={PinIcon}
      label={t("pins.pin")}
      sub={sub}
      side="right"
      align="start"
      sideOffset={8}
      collisionPadding={8}
      zIndex={10000}
    >
      <div className="pin-menu">
        <MenuRow
          toggle
          Icon={SideIcon}
          label={t("pins.side")}
          checked={side}
          onToggle={(on) => setPins(editor, pos, { pinSide: on ?? !side })}
        />
        {hasTop && (
          <MenuRow
            toggle
            Icon={TopIcon}
            label={t("pins.top")}
            checked={top}
            onToggle={(on) => setPins(editor, pos, { pinTop: on ?? !top })}
          />
        )}
        {(side || top) && (
          <MenuRow
            Icon={UnpinIcon}
            label={t("pins.unpinAll")}
            onClick={() => {
              setPins(editor, pos, { pinSide: false, pinTop: false });
              onAction?.();
            }}
          />
        )}
      </div>
    </NavigableMenuItem>
  );
}

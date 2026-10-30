import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import { createIcon } from "src/components/icons";
import { MenuRow } from "src/features/database/components/menu-row";
import { NavigableMenuItem } from "src/features/database/components/navigable-menu-item";
import { pinMenuTarget } from "./pin-menu-target";
import { useCreatePin, useDeletePin, usePins } from "src/hooks/use-pins";
import { useOptionalActivePage } from "src/features/pages/context/active-page-context";
import "./pins.scss";

// The block menu's "Pin" row, for blocks that can be pinned: a flyout with
// Pin to side, Pin to top (the Pomodoro, as a chip) and Unpin everywhere.

const PinIcon = createIcon("PinKeep", "keep");
const SideIcon = createIcon("PinSide", "right_panel_open");
const TopIcon = createIcon("PinTop", "top_panel_open");
const UnpinIcon = createIcon("PinOff", "keep_off");
const MineIcon = createIcon("PinMine", "person");
const TeamIcon = createIcon("PinTeam", "groups");

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
  const { activePageId, activePage } = useOptionalActivePage();
  const teamspaceId = activePage?.teamspaceId ?? null;
  const { data: pins } = usePins();
  const createPin = useCreatePin();
  const deletePin = useDeletePin();
  if (!target) return null;

  const { node, pos } = target;
  const side = !!node.attrs.pinSide;
  const top = !!node.attrs.pinTop;
  const hasTop = TOP_TYPES.has(node.type.name);
  // "Just me": a pin in the pins table, shown in your rail on every page.
  // Needs the block's id (UniqueID) and the page it's on.
  const blockId = (node.attrs.id as string | null) ?? null;
  const minePin =
    blockId && activePageId
      ? pins?.find(
          (p) =>
            p.scope === "mine" &&
            p.pageId === activePageId &&
            p.blockId === blockId,
        )
      : undefined;
  // The open page's teamspace: a pin every member sees in their Team tab.
  const teamPin =
    blockId && activePageId && teamspaceId
      ? pins?.find(
          (p) =>
            p.scope === "teamspace" &&
            p.teamspaceId === teamspaceId &&
            p.pageId === activePageId &&
            p.blockId === blockId,
        )
      : undefined;
  const toggleTeam = () => {
    if (teamPin) deletePin.mutate(teamPin.id);
    else if (blockId && activePageId && teamspaceId)
      createPin.mutate({
        pageId: activePageId,
        blockId,
        scope: "teamspace",
        teamspaceId,
      });
  };
  const toggleMine = () => {
    if (minePin) deletePin.mutate(minePin.id);
    else if (blockId && activePageId)
      createPin.mutate({ pageId: activePageId, blockId, scope: "mine" });
  };
  const where = [
    side ? t("pins.subSide") : null,
    top ? t("pins.subTop") : null,
    minePin ? t("pins.mine") : null,
    teamPin ? t("pins.team") : null,
  ].filter(Boolean);
  const sub = where.length ? where.join(", ") : undefined;

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
        <MenuRow
          toggle
          Icon={MineIcon}
          label={t("pins.mine")}
          sub={t("pins.mineHint")}
          checked={!!minePin}
          disabled={!blockId || !activePageId}
          onToggle={toggleMine}
        />
        {teamspaceId && (
          <MenuRow
            toggle
            Icon={TeamIcon}
            label={t("pins.team")}
            sub={t("pins.teamHint")}
            checked={!!teamPin}
            disabled={!blockId || !activePageId}
            onToggle={toggleTeam}
          />
        )}
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

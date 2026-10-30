import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { JSONContent } from "@tiptap/core";
import { MaterialIcon } from "src/components/icons";
import {
  Card,
  CardGroupLabel,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import { pinDrop, type PendingPinDrop } from "./pin-drop";
import { asCopy } from "./pin-blocks";

// After a pin is dropped in the page (pin-drop.ts): insert a copy, or a live
// view of the original. Opens where it was dropped; Esc or a click outside
// cancels. Mounted once next to the editor (page-editor-layout.tsx).

const MENU_WIDTH = 280;

export function PinDropMenu() {
  const drop = useSyncExternalStore(pinDrop.subscribe, pinDrop.get);
  if (!drop) return null;
  return createPortal(<DropMenu drop={drop} />, document.body);
}

function DropMenu({ drop }: { drop: PendingPinDrop }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.querySelector("button")?.focus();
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) pinDrop.set(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") pinDrop.set(null);
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const insert = (content: JSONContent) => {
    const { editor, pos } = drop;
    pinDrop.set(null);
    if (editor.isDestroyed) return;
    // Someone may have edited the page meanwhile: stay inside it.
    const at = Math.min(pos, editor.state.doc.content.size);
    editor.chain().focus().insertContentAt(at, content).run();
  };

  const { pageId, blockId, node } = drop.payload;
  const left = Math.max(
    8,
    Math.min(drop.x, window.innerWidth - MENU_WIDTH - 8),
  );
  const top = Math.max(8, Math.min(drop.y + 8, window.innerHeight - 150));

  return (
    <Card
      ref={ref}
      className="pin-drop-menu"
      role="menu"
      style={{ left, top, width: MENU_WIDTH }}
    >
      <CardGroupLabel>{t("pins.drop.title")}</CardGroupLabel>
      <CardItemGroup orientation="vertical">
        <button
          type="button"
          role="menuitem"
          className="pin-drop-menu__item"
          onClick={() => insert(asCopy(node))}
        >
          <MaterialIcon name="content_copy" size={17} />
          <span>
            <b>{t("pins.drop.copy")}</b>
            <small>{t("pins.drop.copyHint")}</small>
          </span>
        </button>
        <button
          type="button"
          role="menuitem"
          className="pin-drop-menu__item"
          onClick={() =>
            insert({ type: "blockRef", attrs: { pageId, blockId } })
          }
        >
          <MaterialIcon name="sync_alt" size={17} />
          <span>
            <b>{t("pins.drop.live")}</b>
            <small>{t("pins.drop.liveHint")}</small>
          </span>
        </button>
      </CardItemGroup>
    </Card>
  );
}

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Card } from "src/components/tiptap-ui-primitive/card";
import { appUrl } from "src/lib/app-url";
import { tabs, useTabs, type Tab } from "./tabs-store";
import { canOpenBeside, useOpenBeside } from "../split/use-open-beside";
import {
  canOpenInWindow,
  moveTabToWindow,
} from "../page-window/move-tab-to-window";

// Right click on a tab: new, duplicate, pin, copy link, close, close others,
// close to the right. At the pointer, kept on screen; Escape, a click
// elsewhere or a choice closes it.

export function TabMenu({
  tab,
  x,
  y,
  onClose,
}: {
  tab: Tab;
  x: number;
  y: number;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { tabs: list, activeId } = useTabs();
  const openBeside = useOpenBeside();
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setPos({
      left: Math.max(8, Math.min(x, window.innerWidth - width - 8)),
      top: Math.max(8, Math.min(y, window.innerHeight - height - 8)),
    });
  }, [x, y]);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("blur", onClose);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("blur", onClose);
    };
  }, [onClose]);

  const index = list.findIndex((item) => item.id === tab.id);
  const hasOthers = list.some((item) => item.id !== tab.id && !item.pinned);
  const hasRight = list.slice(index + 1).some((item) => !item.pinned);

  const run = (fn: () => void) => () => {
    fn();
    onClose();
  };

  return createPortal(
    <Card
      ref={ref}
      className="desktop-tab-menu"
      role="menu"
      style={{ position: "fixed", left: pos.left, top: pos.top }}
    >
      <Item
        label={t("desktop.newTab")}
        kbd="Ctrl+T"
        onClick={run(() => tabs.open())}
      />
      <Item
        label={t("desktop.duplicateTab")}
        onClick={run(() => tabs.duplicate(tab.id))}
      />
      <Item
        label={tab.pinned ? t("desktop.unpinTab") : t("desktop.pinTab")}
        onClick={run(() => tabs.togglePin(tab.id))}
      />
      <Item
        label={t("desktop.openBeside")}
        disabled={tab.id === activeId || !canOpenBeside(tab.path)}
        onClick={run(() => openBeside(tab.path))}
      />
      <Item
        label={t("desktop.openInNewWindow")}
        disabled={!canOpenInWindow(tab.path)}
        onClick={run(() => moveTabToWindow(tab))}
      />
      <div className="desktop-tab-menu__sep" role="separator" />
      <Item
        label={t("desktop.copyLink")}
        onClick={run(
          () => void navigator.clipboard.writeText(appUrl(tab.path)),
        )}
      />
      <div className="desktop-tab-menu__sep" role="separator" />
      <Item
        label={t("desktop.closeTab")}
        kbd="Ctrl+W"
        disabled={tab.pinned}
        onClick={run(() => tabs.close(tab.id))}
      />
      <Item
        label={t("desktop.closeOtherTabs")}
        disabled={!hasOthers}
        onClick={run(() => tabs.closeOthers(tab.id))}
      />
      <Item
        label={t("desktop.closeTabsRight")}
        disabled={!hasRight}
        onClick={run(() => tabs.closeToTheRight(tab.id))}
      />
    </Card>,
    document.body,
  );
}

function Item({
  label,
  kbd,
  disabled,
  onClick,
}: {
  label: string;
  kbd?: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className="desktop-tab-menu__item"
      disabled={disabled}
      onClick={onClick}
    >
      <span>{label}</span>
      {kbd && <kbd>{kbd}</kbd>}
    </button>
  );
}

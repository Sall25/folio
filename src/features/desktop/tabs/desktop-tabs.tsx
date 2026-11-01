import { useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { MaterialIcon } from "src/components/icons";
import { SyncStatus } from "src/features/shell/offline/sync-status";
import { TITLE_BAR_SLOT_ID } from "../title-bar/desktop-title-bar";
import { QuickSwitcher } from "../quick-switcher/quick-switcher";
import { SplitDropZone } from "../split/split-drop-zone";
import { TabMenu } from "./tab-menu";
import { useTabLabel } from "./tab-label";
import { tabs, useTabs, type Tab } from "./tabs-store";
import "./desktop-tabs.scss";

// The page tabs in the desktop title bar: back / forward for the active
// tab, the tabs (pinned ones first, icon only), a + for a new tab, and the
// sync status. Click switches, middle click closes, right click opens the
// tab menu, drag reorders. Rendered into the title bar's slot, from inside
// the router (signed-in-app.tsx).

export function DesktopTabs() {
  // The title bar is mounted from App.tsx, long before the signed-in app
  // (a lazy chunk, after sign-in), so its slot is already there.
  const [slot] = useState(() => document.getElementById(TITLE_BAR_SLOT_ID));
  if (!slot) return null;
  return (
    <>
      {createPortal(<TabStrip />, slot)}
      <QuickSwitcher />
    </>
  );
}

function TabStrip() {
  const { t } = useTranslation();
  const { tabs: list, activeId } = useTabs();
  const active = list.find((tab) => tab.id === activeId);
  const [menu, setMenu] = useState<{ tab: Tab; x: number; y: number } | null>(
    null,
  );
  const dragId = useRef<string | null>(null);
  // A tab being dragged (not the active one): the right half of the page
  // offers "Open beside" (B · two pages side by side).
  const [dragging, setDragging] = useState<Tab | null>(null);

  return (
    <div className="desktop-tabs" data-tauri-drag-region>
      <div className="desktop-tabs__nav">
        <button
          type="button"
          className="desktop-tabs__icon-btn"
          aria-label={t("desktop.back")}
          title={`${t("desktop.back")} (Alt+←)`}
          disabled={!active?.back.length}
          onClick={() => tabs.back()}
        >
          <MaterialIcon name="arrow_back" size={18} />
        </button>
        <button
          type="button"
          className="desktop-tabs__icon-btn"
          aria-label={t("desktop.forward")}
          title={`${t("desktop.forward")} (Alt+→)`}
          disabled={!active?.forward.length}
          onClick={() => tabs.forward()}
        >
          <MaterialIcon name="arrow_forward" size={18} />
        </button>
      </div>

      <div
        className="desktop-tabs__list"
        role="tablist"
        aria-label={t("desktop.tabs")}
      >
        {list.map((tab, index) => (
          <TabButton
            key={tab.id}
            tab={tab}
            active={tab.id === activeId}
            onMenu={(e) => setMenu({ tab, x: e.clientX, y: e.clientY })}
            onDragStart={() => {
              dragId.current = tab.id;
              // After the drag has started: changing the page under the
              // pointer in the same event cancels it in some engines.
              if (tab.id !== activeId) setTimeout(() => setDragging(tab), 0);
            }}
            onDragEnd={() => setDragging(null)}
            onDropOn={() => {
              if (dragId.current && dragId.current !== tab.id)
                tabs.move(dragId.current, index);
              dragId.current = null;
            }}
          />
        ))}
        <button
          type="button"
          className="desktop-tabs__icon-btn desktop-tabs__new"
          aria-label={t("desktop.newTab")}
          title={`${t("desktop.newTab")} (Ctrl+T)`}
          onClick={() => tabs.open()}
        >
          <MaterialIcon name="add" size={18} />
        </button>
        <div className="desktop-tabs__fill" data-tauri-drag-region />
      </div>

      <div className="desktop-tabs__status">
        <SyncStatus />
      </div>

      {dragging && (
        <SplitDropZone path={dragging.path} onDone={() => setDragging(null)} />
      )}

      {menu && (
        <TabMenu
          tab={menu.tab}
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}

function TabButton({
  tab,
  active,
  onMenu,
  onDragStart,
  onDragEnd,
  onDropOn,
}: {
  tab: Tab;
  active: boolean;
  onMenu: (e: ReactMouseEvent) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDropOn: () => void;
}) {
  const { t } = useTranslation();
  const { title, icon } = useTabLabel(tab.path);
  const [over, setOver] = useState(false);

  return (
    <div
      className="desktop-tab"
      data-active={active || undefined}
      data-pinned={tab.pinned || undefined}
      data-over={over || undefined}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        // Some engines only drag with data set.
        e.dataTransfer.setData("text/plain", title);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onDropOn();
      }}
      onMouseDown={(e) => {
        // Middle click closes (not a pinned tab: no accidents).
        if (e.button === 1) {
          e.preventDefault();
          if (!tab.pinned) tabs.close(tab.id);
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onMenu(e);
      }}
      title={title}
    >
      <button
        type="button"
        role="tab"
        aria-selected={active}
        className="desktop-tab__main"
        onClick={() => tabs.activate(tab.id)}
      >
        <span className="desktop-tab__icon">{icon}</span>
        {!tab.pinned && <span className="desktop-tab__title">{title}</span>}
      </button>
      {!tab.pinned && (
        <button
          type="button"
          className="desktop-tab__close"
          aria-label={t("desktop.closeTab")}
          title={`${t("desktop.closeTab")} (Ctrl+W)`}
          onClick={() => tabs.close(tab.id)}
        >
          <MaterialIcon name="close" size={14} />
        </button>
      )}
    </div>
  );
}

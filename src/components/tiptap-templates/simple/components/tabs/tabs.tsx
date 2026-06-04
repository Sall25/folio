import {
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { TabPicker } from "./tab-picker";
import type { Page } from "../../types";
import type { Tab } from "./types";
import type { FuzzyResult } from "src/lib/fuzzy-match";
import styles from "./tabs.module.scss";

export interface TabsProps {
  tabs: RefObject<Tab[]>;
  activeTabId: string;
  /** Merged onto the strip — lets TabToolbar size/flex it. */
  className?: string;
  /** Used to resolve a "page" tab's title + icon from its pageId. */
  pages: Page[];
  onSelect: (tabId: string) => void;
  onClose: (tabId: string) => void;
  /** Move the tab at `from` to position `to`. */
  onReorder: (from: number, to: number) => void;

  // Forwarded to the picker behind the + button:
  recentPageIds?: Page["id"][];
  onOpenPage: (page: Page) => void;
  onCreatePage: (title: string) => void;
  renderIcon?: (iconName: string | null) => ReactNode;
  fuzzy?: (query: string, target: string) => FuzzyResult;
}

const VIEW_LABELS: Record<string, string> = {
  home: "Home",
  resources: "Resources",
};

export function Tabs({
  tabs,
  activeTabId,
  className,
  pages,
  onSelect,
  onClose,
  onReorder,
  recentPageIds,
  onOpenPage,
  onCreatePage,
  renderIcon,
  fuzzy,
}: TabsProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const dragFrom = useRef<number | null>(null);

  const pagesById = useMemo(
    () => new Map(pages.map((p) => [p.id, p])),
    [pages],
  );

  const describe = (tab: Tab): { title: string; iconName: string | null } => {
    if (tab.view !== "page") {
      return { title: VIEW_LABELS[tab.view] ?? tab.view, iconName: null };
    }
    const page = tab.pageId != null ? pagesById.get(tab.pageId) : undefined;
    return {
      title: page?.title || "Untitled",
      iconName: page?.cover.iconName ?? null,
    };
  };

  const icon = (name: string | null): ReactNode =>
    renderIcon ? renderIcon(name) : (name ?? "▢");

  const closeTab = (e: MouseEvent, tabId: string) => {
    e.stopPropagation();
    onClose(tabId);
  };

  const onAuxClick = (e: MouseEvent, tabId: string) => {
    if (e.button === 1) {
      e.preventDefault();
      onClose(tabId);
    }
  };

  const handleDrop = (to: number) => {
    const from = dragFrom.current;
    if (from !== null && from !== to) onReorder(from, to);
    dragFrom.current = null;
  };

  return (
    <div className={`${styles.strip}${className ? ` ${className}` : ""}`}>
      <div className={styles.scroller} role="tablist" aria-label="Open pages">
        {tabs.current.map((tab, i) => {
          const selected = tab.id === activeTabId;
          const { title, iconName } = describe(tab);
          return (
            <div
              key={tab.id}
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              draggable
              onDragStart={() => (dragFrom.current = i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(i)}
              className={`${styles.tab} ${selected ? styles.active : ""}`}
              onClick={() => onSelect(tab.id)}
              onAuxClick={(e) => onAuxClick(e, tab.id)}
              title={title}
            >
              <span className={styles.icon}>{icon(iconName)}</span>
              <span className={styles.title}>{title}</span>
              <button
                type="button"
                className={styles.close}
                aria-label={`Close ${title}`}
                onClick={(e) => closeTab(e, tab.id)}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      <div className={styles.newWrap}>
        <button
          type="button"
          className={styles.newTab}
          aria-label="New tab"
          aria-expanded={pickerOpen}
          onClick={() => setPickerOpen((o) => !o)}
        >
          ＋
        </button>

        {pickerOpen && (
          <div className={styles.popover}>
            <TabPicker
              pages={pages}
              recentPageIds={recentPageIds}
              renderIcon={renderIcon}
              fuzzy={fuzzy}
              onSelect={(page) => onOpenPage(page)}
              onCreate={(title) => onCreatePage(title)}
              onClose={() => setPickerOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default Tabs;

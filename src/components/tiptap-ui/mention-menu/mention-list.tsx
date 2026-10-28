import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type { SuggestionKeyDownProps } from "@tiptap/suggestion";
import type { MentionItem, MentionListProps, MentionListRef } from "./types";
import { useCurrentEditor } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import {
  AlarmClock,
  ArrowLeft,
  ArrowUpRight,
  Clock,
  MoreHorizontal,
  Plus,
  UserPlus,
} from "src/components/icons";
import { PageItemIcon } from "src/features/pages/page-item/page-item-icon";
import { useMentionData } from "./use-mention-data";
import "./mention-list.scss";

// The @ menu: Date · People (and Invite…) · Link to page · Rows · New page.
//
// Long page lists show the first few and a "N more results" row that opens
// the rest. "Add new page in…" switches the menu to a list of pages to put
// the new page in. Keyboard: ↑ ↓ move over the rows you can choose (section
// labels are skipped), Enter chooses, Escape closes (in the page picker it
// goes back).

const SECTION_KEYS = {
  Date: "mention.sections.dates",
  People: "mention.sections.people",
  Pages: "mention.sections.linkToPage",
  Rows: "mention.sections.rows",
  NewPage: "mention.sections.newPage",
} as const;

const PAGES_SHOWN = 5;

// A pick (Enter or click) this soon after the menu opens isn't one: nobody
// reads the list and chooses in a quarter of a second. It's an event that was
// already on its way when "@" opened the menu — and it used to insert the
// first page, at random.
const PICK_GRACE_MS = 250;

const isSelectable = (item: MentionItem | undefined) =>
  !!item && item.type !== "divider";

/** The rows shown: pages past the first few fold into "N more results". */
function visibleRows(items: MentionItem[], expanded: boolean): MentionItem[] {
  if (expanded) return items;
  const out: MentionItem[] = [];
  let pages = 0;
  let hidden = 0;
  for (const item of items) {
    if (item.type === "page") {
      pages++;
      if (pages > PAGES_SHOWN) {
        hidden++;
        continue;
      }
    } else if (hidden > 0) {
      out.push({ id: "more-pages", label: "", type: "more", count: hidden });
      hidden = 0;
    }
    out.push(item);
  }
  if (hidden > 0)
    out.push({ id: "more-pages", label: "", type: "more", count: hidden });
  return out;
}

const MentionList = forwardRef<MentionListRef, MentionListProps>(
  ({ items, command }, ref) => {
    const { t } = useTranslation();
    const { editor } = useCurrentEditor();
    // Normally already there (mounted with the editor); this covers an
    // editor that doesn't mount it.
    useMentionData(editor);

    const [expanded, setExpanded] = useState(false);
    // "Add new page in…": the page list to choose the parent from.
    const [pickParentFor, setPickParentFor] = useState<MentionItem | null>(
      null,
    );

    const rows = useMemo(() => {
      if (!pickParentFor) return visibleRows(items, expanded);
      const pages = items.filter((i) => i.type === "page");
      return [
        {
          id: "divider-pick",
          label: "",
          title: "Pages",
          type: "divider",
        } as MentionItem,
        ...pages,
      ];
    }, [items, expanded, pickParentFor]);

    const firstSelectable = (list: MentionItem[]) =>
      Math.max(0, list.findIndex(isSelectable));
    const [selectedIndex, setSelectedIndex] = useState(() =>
      firstSelectable(rows),
    );

    // New results → back to the first row (adjusted during render, the
    // React way to reset state when a prop changes).
    const [prevItems, setPrevItems] = useState(items);
    if (items !== prevItems) {
      setPrevItems(items);
      setExpanded(false);
      setSelectedIndex(firstSelectable(visibleRows(items, false)));
    }

    const [menuVisible, setMenuVisible] = useState(false);
    useEffect(() => {
      const raf = requestAnimationFrame(() => setMenuVisible(true));
      return () => cancelAnimationFrame(raf);
    }, []);

    // When the menu opened (set once mounted, read in event handlers).
    const openedAt = useRef<number | null>(null);
    useEffect(() => {
      openedAt.current = performance.now();
    }, []);

    // Keep the chosen row in view while moving with the keyboard.
    const listRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
      listRef.current
        ?.querySelector<HTMLElement>(`[data-index="${selectedIndex}"]`)
        ?.scrollIntoView({ block: "nearest" });
    }, [selectedIndex]);

    const selectItem = (index: number, how: "enter" | "click") => {
      const item = rows[index];
      if (!isSelectable(item)) return;
      const opened = openedAt.current;
      if (opened == null || performance.now() - opened < PICK_GRACE_MS) {
        console.warn(
          `[mention] ignored a ${how} right after the menu opened`,
          item.label,
        );
        return;
      }
      if (item.type === "more") {
        setExpanded(true);
        // Stay on the first page that was hidden.
        setSelectedIndex(index);
        return;
      }
      if (item.type === "action" && item.action === "pageIn") {
        setPickParentFor(item);
        setSelectedIndex(1);
        return;
      }
      if (pickParentFor && item.type === "page") {
        command({
          id: "action-create-in",
          label: "",
          type: "action",
          action: "createIn",
          parentId: item.id,
          newTitle: pickParentFor.newTitle,
        });
        return;
      }
      command(item);
    };

    const move = (step: 1 | -1) =>
      setSelectedIndex((prev) => {
        if (!rows.some(isSelectable)) return prev;
        let i = prev;
        do {
          i = (i + step + rows.length) % rows.length;
        } while (!isSelectable(rows[i]));
        return i;
      });

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: SuggestionKeyDownProps) => {
        if (event.key === "ArrowUp") {
          move(-1);
          return true;
        }
        if (event.key === "ArrowDown") {
          move(1);
          return true;
        }
        if (event.key === "Enter") {
          selectItem(selectedIndex, "enter");
          return true;
        }
        if (event.key === "Escape" && pickParentFor) {
          setPickParentFor(null);
          setSelectedIndex(firstSelectable(visibleRows(items, expanded)));
          return true;
        }
        return false;
      },
    }));

    const rowProps = (index: number) => ({
      className: "mention-row",
      "data-index": index,
      "data-highlighted": index === selectedIndex || undefined,
      onMouseEnter: () => setSelectedIndex(index),
      onMouseDown: (e: React.MouseEvent) => e.preventDefault(),
      onClick: () => selectItem(index, "click"),
      role: "option" as const,
      "aria-selected": index === selectedIndex,
    });

    const renderRow = (item: MentionItem, index: number) => {
      if (item.type === "divider") {
        return (
          <div key={item.id} className="mention-section" role="presentation">
            {item.title ? t(SECTION_KEYS[item.title]) : ""}
          </div>
        );
      }
      if (item.type === "date") {
        return (
          <div key={item.id} {...rowProps(index)}>
            {item.remind ? (
              <AlarmClock className="mention-row__icon" />
            ) : (
              <Clock className="mention-row__icon" />
            )}
            <span className="mention-row__label">{item.label}</span>
            {item.hint && (
              <span className="mention-row__hint">— {item.hint}</span>
            )}
          </div>
        );
      }
      if (item.type === "user") {
        return (
          <div key={item.id} {...rowProps(index)}>
            {item.avatar ? (
              <img className="mention-row__avatar" src={item.avatar} alt="" />
            ) : (
              <span className="mention-row__avatar is-initial">
                {item.label.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="mention-row__label">{item.label}</span>
          </div>
        );
      }
      if (item.type === "page" || item.type === "row") {
        const sub = item.type === "page" ? item.path : item.hint;
        return (
          <div
            key={item.id}
            {...rowProps(index)}
            data-two-lines={sub ? true : undefined}
          >
            <span className="mention-row__page-icon">
              {item.cover && <PageItemIcon cover={item.cover} />}
            </span>
            <span className="mention-row__text">
              <span className="mention-row__label">
                {item.idText && (
                  <span className="mention-row__id">{item.idText}</span>
                )}
                {item.label}
              </span>
              {sub && <span className="mention-row__sub">{sub}</span>}
            </span>
          </div>
        );
      }
      if (item.type === "more") {
        return (
          <div key={item.id} {...rowProps(index)} data-muted>
            <MoreHorizontal className="mention-row__icon" />
            <span className="mention-row__label">
              {t("mention.moreResults", { count: item.count ?? 0 })}
            </span>
          </div>
        );
      }
      // Actions
      const action = {
        invite: {
          Icon: UserPlus,
          label: item.label
            ? t("mention.inviteEmail", { email: item.label })
            : t("mention.invite"),
        },
        subpage: { Icon: Plus, label: t("mention.addSubPage") },
        pageIn: { Icon: ArrowUpRight, label: t("mention.addPageIn") },
        createIn: { Icon: Plus, label: "" },
      }[item.action ?? "subpage"];
      return (
        <div key={item.id} {...rowProps(index)}>
          <action.Icon className="mention-row__icon" />
          <span className="mention-row__label">{action.label}</span>
          {(item.action === "subpage" || item.action === "pageIn") &&
            item.newTitle && (
              <span className="mention-row__hint">“{item.newTitle}”</span>
            )}
        </div>
      );
    };

    return (
      <div
        className="mention-menu"
        data-mention-menu-open={menuVisible}
        role="listbox"
        ref={listRef}
      >
        {pickParentFor && (
          <div className="mention-menu__picker-head">
            <button
              type="button"
              className="mention-menu__back"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setPickParentFor(null)}
              aria-label={t("mention.back")}
            >
              <ArrowLeft />
            </button>
            <span>{t("mention.chooseParent")}</span>
          </div>
        )}
        {rows.length === 0 ? (
          <div className="mention-section">{t("mention.noResults")}</div>
        ) : (
          rows.map((item, index) => {
            // A line between sections, like the block menu.
            const sep =
              item.type === "divider" && index > 0 ? (
                <div
                  key={`sep-${item.id}`}
                  className="mention-sep"
                  role="presentation"
                />
              ) : null;
            return [sep, renderRow(item, index)];
          })
        )}
      </div>
    );
  },
);

MentionList.displayName = "MentionList";
export default MentionList;

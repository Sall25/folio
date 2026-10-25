import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { SuggestionKeyDownProps } from "@tiptap/suggestion";
import type { MentionListProps } from "./types";
import type { MentionListRef } from "./types";
import { Card, CardGroupLabel } from "src/components/tiptap-ui-primitive/card";
import { Button } from "src/components/tiptap-ui-primitive/button";

import "./mention-list.scss";
import { AlarmClock, Clock, File, Rows3, Users } from "src/components/icons";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { Badge } from "src/components/tiptap-ui-primitive/badge";
import { PageItemIcon } from "src/features/pages/page-item/page-item-icon";
import { useCurrentEditor } from "@tiptap/react";
import { useMentionData } from "./use-mention-data";
import { useTranslation } from "react-i18next";

const SECTION_KEYS = {
  Date: "mention.sections.dates",
  Pages: "mention.sections.pages",
  People: "mention.sections.people",
  Rows: "mention.sections.rows",
} as const;

// A pick (Enter or click) this soon after the menu opens isn't one: nobody
// reads the list and chooses in a quarter of a second. It's an event that was
// already on its way when "@" opened the menu — and it used to insert the
// first page, at random.
const PICK_GRACE_MS = 250;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isSelectable = (item: any) => !item.title && item.type !== "divider";

const MentionList = forwardRef<MentionListRef, MentionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(() =>
      items.findIndex(isSelectable),
    );
    const [menuVisible, setMenuVisible] = useState(false);
    const { t } = useTranslation();

    // New results → back to the first selectable one (adjusted during
    // render, the React way to reset state when a prop changes).
    const [prevItems, setPrevItems] = useState(items);
    if (items !== prevItems) {
      setPrevItems(items);
      setSelectedIndex(items.findIndex(isSelectable));
    }

    // When the menu opened (set once mounted, read in event handlers).
    const openedAt = useRef<number | null>(null);
    useEffect(() => {
      openedAt.current = performance.now();
    }, []);

    const selectItem = (index: number, how: "enter" | "click") => {
      const item = items[index];
      if (!item || !isSelectable(item)) return;
      const opened = openedAt.current;
      if (opened == null || performance.now() - opened < PICK_GRACE_MS) {
        // Logged so a stray event can be traced if it ever happens again.
        console.warn(
          `[mention] ignored a ${how} right after the menu opened`,
          item.label,
        );
        return;
      }
      command(item);
    };

    const upHandler = () => {
      setSelectedIndex((prev) => {
        let i = (prev + items.length - 1) % items.length;
        while (!isSelectable(items[i])) {
          i = (i + items.length - 1) % items.length;
        }
        return i;
      });
    };

    const downHandler = () => {
      setSelectedIndex((prev) => {
        let i = (prev + 1) % items.length;
        while (!isSelectable(items[i])) {
          i = (i + 1) % items.length;
        }
        return i;
      });
    };

    const enterHandler = () => {
      selectItem(selectedIndex, "enter");
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: SuggestionKeyDownProps) => {
        if (event.key === "ArrowUp") {
          upHandler();
          return true;
        }
        if (event.key === "ArrowDown") {
          downHandler();
          return true;
        }
        if (event.key === "Enter") {
          enterHandler();
          return true;
        }
        return false;
      },
    }));

    useEffect(() => {
      const raf = requestAnimationFrame(() => {
        setMenuVisible(true);
      });
      return () => cancelAnimationFrame(raf);
    }, []);

    const { editor } = useCurrentEditor();

    // Normally already there (mounted with the editor); this covers an
    // editor that doesn't mount it.
    useMentionData(editor);

    return (
      <Card className="mention-menu" data-mention-menu-open={menuVisible}>
        {items.length === 0 && (
          <CardGroupLabel>{t("mention.noResults")}</CardGroupLabel>
        )}

        {items.map((item, index) => (
          <div key={index} style={{ display: "contents" }}>
            {item.type === "divider" && (
              <>
                <CardGroupLabel className="mention-title">
                  <Spacer orientation="horizontal" size={5} />
                  {item.title === "Date" ? (
                    <AlarmClock />
                  ) : item.title === "Pages" ? (
                    <File />
                  ) : item.title === "Rows" ? (
                    <Rows3 />
                  ) : (
                    <Users />
                  )}
                  <span>{item.title ? t(SECTION_KEYS[item.title]) : ""}</span>
                </CardGroupLabel>
              </>
            )}
            {item.date && (
              <Button
                className="mention-item"
                data-highlighted={index === selectedIndex}
                variant="ghost"
                onClick={() => selectItem(index, "click")}
              >
                <Clock className="tiptap-button-icon" />
                <span>{item.label}</span>
                {item.hint && (
                  <span className="mention-item__hint">{item.hint}</span>
                )}
              </Button>
            )}
            {!item.title &&
              !item.date &&
              item.type === "page" &&
              item.cover && (
                <Button
                  className="mention-item"
                  data-highlighted={index === selectedIndex}
                  onClick={() => selectItem(index, "click")}
                >
                  <PageItemIcon cover={item.cover} styles={{ fontSize: 12 }} />
                  <span>{item.label}</span>
                </Button>
              )}
            {!item.title && !item.date && item.type === "row" && (
              <Button
                className="mention-item"
                data-highlighted={index === selectedIndex}
                onClick={() => selectItem(index, "click")}
              >
                {item.cover && (
                  <PageItemIcon cover={item.cover} styles={{ fontSize: 12 }} />
                )}
                {item.idText && (
                  <span className="mention-item__id">{item.idText}</span>
                )}
                <span>{item.label}</span>
                {item.hint && (
                  <span className="mention-item__hint">{item.hint}</span>
                )}
              </Button>
            )}
            {!item.title && !item.date && item.type === "user" && (
              <Button
                className="mention-item"
                data-highlighted={index === selectedIndex}
                onClick={() => selectItem(index, "click")}
              >
                <img
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "100%",
                  }}
                  src={item.avatar}
                  alt="profile"
                />
                <CardGroupLabel>{item.label}</CardGroupLabel>
                <Spacer orientation="horizontal" />
                <Badge>{item.role}</Badge>
              </Button>
            )}
          </div>
        ))}
      </Card>
    );
  },
);

MentionList.displayName = "MentionList";
export default MentionList;

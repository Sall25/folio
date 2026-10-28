import type { SuggestionProps } from "@tiptap/suggestion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardGroupLabel } from "src/components/tiptap-ui-primitive/card";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { Button, ButtonGroup } from "src/components/tiptap-ui-primitive/button";

import "./slash-command-list.scss";
import { useMenuNavigation } from "src/hooks/use-menu-navigation";
import type { SlashCommand as SlashItem } from "./slash-commands";
import { useOptionalActivePage } from "src/features/pages/context/active-page-context";
import { useCreatePage } from "src/hooks/use-create-page";
import { makeChildPage } from "src/utils/make-page";
import { Badge } from "src/components/tiptap-ui-primitive/badge";
import { baseSlashId } from "./slash-search";

type Props = SuggestionProps<SlashItem> & {
  selectedIndex?: number;
  onClickItem?: (item: SlashItem) => void;
  onClose?: () => void;
};

export default function SlashList(props: Props) {
  const { items = [], onClickItem, onClose, editor } = props;
  const { t } = useTranslation();
  const createPage = useCreatePage();
  // Optional: the slash menu also runs in the landing's live editor, outside
  // the app's providers (there, "new page" isn't offered).
  const { activePageId, activePage, setActivePageId } = useOptionalActivePage();
  const isSelectable = (item: SlashItem) => item.type === "command";

  const selectableItems = useMemo(() => items.filter(isSelectable), [items]);

  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  // containerRef → the Card (what useMenuNavigation expects).
  // scrollRef → the inner scrolling region (used for auto-scroll math).
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const { selectedIndex } = useMenuNavigation({
    editor: props.editor,
    items: selectableItems,
    containerRef,
    orientation: "vertical",
    autoSelectFirstItem: true,
    onSelect: (item) => {
      onClickItem?.(item);
      if (baseSlashId(item.id) === "page-1") {
        const parentId = activePageId;
        if (parentId === null || !activePage) return;
        const page = makeChildPage(activePage, t("page.newPage"));
        createPage.mutate(page);

        // eslint-disable-next-line react-hooks/immutability
        editor.storage.pageLink.pages = [
          ...editor.storage.pageLink.pages,
          page,
        ];
        editor.commands.insertContent({
          type: "pageLink",
          attrs: {
            pageId: page.id,
            parentId: parentId,
            title: page.title,
          },
        });
        setActivePageId(page.id);
      }
    },
    onClose() {
      onClose?.();
    },
  });

  const selectedItem = useMemo(
    () => selectableItems[selectedIndex ?? 0],
    [selectableItems, selectedIndex],
  );

  const selectedFullIndex = useMemo(
    () => items.findIndex((item) => item.id === selectedItem?.id),
    [items, selectedItem],
  );

  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMenuVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const el = itemRefs.current[selectedFullIndex ?? 0];
    if (!el) return;
    el.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: "smooth",
    });
  }, [selectedFullIndex]);

  useEffect(() => {
    const el = itemRefs.current[selectedFullIndex];
    const container = scrollRef.current;
    if (!el || !container) return;

    const elTop = el.offsetTop;
    const elBottom = elTop + el.offsetHeight;
    const viewTop = container.scrollTop;
    const viewBottom = viewTop + container.clientHeight;

    if (elTop < viewTop) {
      container.scrollTo({ top: elTop, behavior: "smooth" });
    } else if (elBottom > viewBottom) {
      container.scrollTo({
        top: elBottom - container.clientHeight,
        behavior: "smooth",
      });
    }
  }, [selectedIndex, selectedFullIndex]);

  if (items.length === 0) return null;

  return (
    <Card
      ref={containerRef}
      tabIndex={0}
      className="slash-menu"
      role="listbox"
      aria-label={t("slash.commandsAria")}
      data-slash-menu-open={menuVisible}
    >
      <div className="slash-menu__scroll" ref={scrollRef}>
        {items.map((item, i) => {
          const selectable = isSelectable(item);
          const isActive = selectedFullIndex === i;
          const Icon = item.icon;
          const isColor = !!(item.highlightColor || item.textColor);
          const highlighted =
            item.isActive?.(props.editor) || selectedFullIndex === i;

          return (
            <ButtonGroup
              style={{ minWidth: "200px", width: "100%" }}
              orientation="vertical"
              key={item.id}
              ref={(node) => {
                if (selectable) itemRefs.current[i] = node;
              }}
              role={selectable ? "option" : undefined}
              aria-selected={selectable ? isActive : undefined}
              onMouseDown={(e) => {
                if (!selectable) return;
                e.preventDefault();
                onClickItem?.(item);
              }}
            >
              {item.type === "title" && (
                <CardGroupLabel className="slash-title">
                  {item.title}
                </CardGroupLabel>
              )}

              {item.type === "separator" && (
                <Separator orientation="horizontal" />
              )}

              {item.type === "command" && (
                <Button
                  role="menuitem"
                  variant="ghost"
                  // data-highlighted={highlighted}
                  data-active-state={highlighted ? "on" : "off"}
                  className="slash-item"
                >
                  <span
                    className={`slash-item__icon${
                      isColor ? " slash-item__icon--bare" : ""
                    }`}
                  >
                    {item.highlightColor ? (
                      <span
                        className="slash-color-swatch"
                        style={{ backgroundColor: item.highlightColor }}
                      />
                    ) : item.textColor ? (
                      <span
                        className="slash-text-swatch"
                        style={{ color: item.textColor }}
                      >
                        A
                      </span>
                    ) : (
                      Icon && <Icon className="tiptap-button-icon" />
                    )}
                  </span>

                  <span className="slash-item__text">
                    <span className="slash-item__title">{item.title}</span>
                    {item.description && (
                      <span className="slash-item__desc">
                        {item.description}
                      </span>
                    )}
                  </span>
                </Button>
              )}
            </ButtonGroup>
          );
        })}
      </div>

      <div className="slash-menu__footer">
        <Button
          type="button"
          className="slash-menu__close"
          aria-label={t("slash.closeAria")}
          onMouseDown={(e) => {
            // preventDefault keeps editor focus so onClose can exit cleanly
            e.preventDefault();
            onClose?.();
          }}
        >
          <span className="tiptap-button-text">{t("actions.close")}</span>
          <Badge>Esc</Badge>
          {/* <kbd className="slash-menu__kbd">Esc</kbd> */}
        </Button>
      </div>
    </Card>
  );
}

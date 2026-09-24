import { useTranslation } from "react-i18next";
import { Avatar } from "src/components/tiptap-ui-primitive/avatar";
import { PageItemIcon } from "../../page-item-icon";
import type { ChatPerson } from "src/types";
import type { Page } from "src/types";
import "./mention-picker.scss";

export type MentionItem =
  | { kind: "person"; person: ChatPerson }
  | { kind: "page"; page: Page };

// The @ dropdown above the composer. Presentational — the composer owns the
// query, the items, and the keyboard.
export function MentionPicker({
  items,
  activeIndex,
  onPick,
  onHover,
}: {
  items: MentionItem[];
  activeIndex: number;
  onPick: (item: MentionItem) => void;
  onHover: (index: number) => void;
}) {
  const { t } = useTranslation();
  const people = items.filter((i) => i.kind === "person");
  const pages = items.filter((i) => i.kind === "page");

  const row = (item: MentionItem, index: number) => {
    const active = index === activeIndex;
    return (
      <button
        key={
          item.kind === "person" ? `p:${item.person.id}` : `g:${item.page.id}`
        }
        type="button"
        className={`mp-row${active ? " is-active" : ""}`}
        // Keep focus in the composer.
        onMouseDown={(e) => e.preventDefault()}
        onMouseEnter={() => onHover(index)}
        onClick={() => onPick(item)}
      >
        {item.kind === "person" ? (
          <>
            <Avatar
              size="sm"
              src={item.person.avatarUrl ?? undefined}
              name={item.person.name}
            />
            <span className="mp-row__label">{item.person.name}</span>
          </>
        ) : (
          <>
            <span className="mp-row__icon">
              <PageItemIcon
                cover={item.page.cover}
                styles={{ width: 15, height: 15, fontSize: 15 }}
              />
            </span>
            <span className="mp-row__label">
              {item.page.title || t("page.untitled")}
            </span>
          </>
        )}
      </button>
    );
  };

  if (!items.length) {
    return (
      <div className="mp" role="listbox">
        <div className="mp__empty">{t("chat.mentionNone", "No matches")}</div>
      </div>
    );
  }

  return (
    <div className="mp" role="listbox">
      {people.length > 0 && (
        <>
          <div className="mp__label">{t("chat.mentionPeople", "People")}</div>
          {people.map((item) => row(item, items.indexOf(item)))}
        </>
      )}
      {pages.length > 0 && (
        <>
          <div className="mp__label">{t("chat.mentionPages", "Pages")}</div>
          {pages.map((item) => row(item, items.indexOf(item)))}
        </>
      )}
    </div>
  );
}

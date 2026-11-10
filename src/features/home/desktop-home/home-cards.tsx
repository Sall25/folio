import { forwardRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Page } from "src/types";
import { Avatar } from "src/components/tiptap-ui-primitive/avatar";
import { usePeopleById } from "src/hooks/use-people";
import { useCurrentPerson } from "src/hooks/use-session";
import { PageItemIcon } from "src/features/pages/page-item/page-item-icon";
import { homeWhen } from "../home-time";

// The desktop Home's recent pages as cards: the icon, the title on two
// lines, where the page lives (its teamspace, Private or Shared), and who
// edited it last and when. The box moves the selection with the arrow keys
// (desktop-home.tsx); the grid's column count follows Home's width
// (desktop-home.scss), and the box reads it from the grid itself.

const editedAt = (p: Page) => p.updatedAt ?? p.createdAt;

export const HomeCards = forwardRef<
  HTMLUListElement,
  {
    id: string;
    pages: Page[];
    allPages: Page[];
    active: number;
    onActive: (index: number) => void;
    onOpen: (page: Page) => void;
  }
>(function HomeCards({ id, pages, allPages, active, onActive, onOpen }, ref) {
  const { t, i18n } = useTranslation();
  const { person: me } = useCurrentPerson();
  const people = usePeopleById(pages.map((p) => p.editedBy ?? p.ownerId));

  const placeOf = (p: Page): { icon?: ReactNode; label: string } => {
    if (p.teamspaceId) {
      const root = allPages.find((x) => x.id === p.teamspaceId);
      return {
        icon: root ? (
          <PageItemIcon
            cover={root.cover}
            styles={{ width: 13, height: 13, fontSize: 11 }}
          />
        ) : undefined,
        label: root?.title || t("teamspaces.untitled"),
      };
    }
    return {
      label:
        p.category === "Shared"
          ? t("home.place.shared")
          : t("home.place.private"),
    };
  };

  return (
    <ul ref={ref} id={id} role="listbox" className="dhome__cards">
      {pages.map((p, i) => {
        const place = placeOf(p);
        const editorId = p.editedBy ?? p.ownerId;
        const editor =
          editorId === me?.id ? null : editorId ? people.get(editorId) : null;
        const editorName =
          editorId === me?.id ? t("home.you") : (editor?.name ?? "—");
        const selected = i === active;
        return (
          <li
            key={p.id}
            id={`${id}-${i}`}
            role="option"
            aria-selected={selected}
            className="dhome__card"
            onMouseEnter={() => onActive(i)}
            onClick={() => onOpen(p)}
          >
            <span className="dhome__card-top">
              <PageItemIcon
                cover={p.cover}
                styles={{ width: 20, height: 20, fontSize: 17 }}
              />
              {selected && <kbd className="dhome__kbd">↵</kbd>}
            </span>
            <span className="dhome__card-title">
              {p.title || t("page.untitled")}
            </span>
            <span className="dhome__card-place">
              {place.icon}
              <span>{place.label}</span>
            </span>
            <span className="dhome__card-foot">
              <Avatar
                name={editorName}
                src={editorId === me?.id ? me?.avatarUrl : editor?.avatarUrl}
                size="xs"
                showTooltip={false}
              />
              <span>
                {editorName} · {homeWhen(editedAt(p), t, i18n.language)}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
});

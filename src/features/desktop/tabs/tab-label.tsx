import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { MaterialIcon } from "src/components/icons";
import { usePage } from "src/hooks/use-pages";
import { useChatRoom } from "src/hooks/use-chat";
import { PageItemIcon } from "src/features/pages/page-item/page-item-icon";

// A tab's title and icon, from its address: a page's own title and icon
// (live: a rename shows at once), a chat's name, or the app's place
// (Home, Inbox, Trash, Library). Same addresses as src/app/routes.

type Place =
  | { kind: "page"; id: string }
  | { kind: "chat"; id: string }
  | { kind: "home" | "inbox" | "trash" | "library" };

export function placeOf(path: string): Place {
  const pathname = path.split(/[?#]/)[0];
  const page = pathname.match(/(?:^|\/)page\/([^/]+)/);
  if (page) return { kind: "page", id: decodeURIComponent(page[1]) };
  const chat = pathname.match(/(?:^|\/)chat\/([^/]+)/);
  if (chat) return { kind: "chat", id: decodeURIComponent(chat[1]) };
  // A teamspace's home: its root page.
  const teamspace = pathname.match(/^\/t\/([^/]+)\/?$/);
  if (teamspace) return { kind: "page", id: decodeURIComponent(teamspace[1]) };
  if (pathname.startsWith("/inbox")) return { kind: "inbox" };
  if (pathname.startsWith("/trash")) return { kind: "trash" };
  if (pathname.startsWith("/library")) return { kind: "library" };
  return { kind: "home" };
}

const PLACE_ICON = {
  home: "home",
  inbox: "inbox",
  trash: "delete",
  library: "library_books",
} as const;

export function useTabLabel(path: string): { title: string; icon: ReactNode } {
  const { t } = useTranslation();
  const place = placeOf(path);
  const { data: page } = usePage(place.kind === "page" ? place.id : null);
  const { room } = useChatRoom(place.kind === "chat" ? place.id : null);

  if (place.kind === "page") {
    return {
      title: page?.title || t("page.untitled"),
      icon: (
        <PageItemIcon
          cover={page?.cover}
          styles={{ width: 16, height: 16, fontSize: 14 }}
        />
      ),
    };
  }
  if (place.kind === "chat") {
    return {
      title: room?.name || t("chat.title"),
      icon: <MaterialIcon name="forum" size={16} />,
    };
  }
  return {
    title: t(`sidebar.${place.kind}`),
    icon: <MaterialIcon name={PLACE_ICON[place.kind]} size={16} />,
  };
}

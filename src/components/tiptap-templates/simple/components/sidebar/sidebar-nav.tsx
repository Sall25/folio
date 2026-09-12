import { memo } from "react";
import { Search, Home, Plus } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { InboxIcon } from "src/components/tiptap-icons";
import { useSearch } from "../../context/search-context";
import { useNotificationState } from "src/components/tiptap-ui/notification/notification-context";
import { useNavigate } from "@tanstack/react-location";
import { useTranslation } from "react-i18next";
import { useCreatePage } from "src/hooks/use-create-page";
import { useActivePage } from "../../context/active-page-context";
import { useCurrentPerson } from "src/hooks/use-session";
import { makePage } from "src/utils/make-page";

export const SidebarNav = memo(() => {
  const { open, onOpenChange } = useSearch();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { unreadCount } = useNotificationState();
  const createPage = useCreatePage();
  const { setActivePageId, activePageId } = useActivePage();
  const { person } = useCurrentPerson();

  const onCreatePage = () => {
    if (!person) return;
    const newPage = makePage({
      title: t("page.newPage"),
      parentId: null,
      category: "Private",
      ownerId: person.id,
    });
    createPage
      .mutateAsync(newPage)
      .then((created) => setActivePageId(created.id))
      .catch(() => {
        if (activePageId) setActivePageId(activePageId);
      });
  };

  const handleHomeClick = () => {
    navigate({ to: "/" });
  };

  return (
    <CardItemGroup>
      <Button
        data-highlighted={open}
        variant="ghost"
        size="large"
        onClick={() => onOpenChange?.(true)}
      >
        <Search className="tiptap-button-icon" />
        <Spacer orientation="horizontal" size={3} />
        <span className="tiptap-button-text">{t("sidebar.search")}</span>
      </Button>
      <Button onClick={handleHomeClick} variant="ghost" size="large">
        <Home className="tiptap-button-icon" />
        <Spacer orientation="horizontal" size={3} />
        <span className="tiptap-button-text">{t("sidebar.home")}</span>
      </Button>
      <Button variant="ghost" size="large">
        <InboxIcon className="tiptap-button-icon" />
        <Spacer orientation="horizontal" size={3} />
        <span className="tiptap-button-text">{t("sidebar.inbox")}</span>
        {unreadCount > 0 && (
          <>
            <Spacer orientation="horizontal" size={6} />
            <span className="sidebar-inbox-badge">{unreadCount}</span>
          </>
        )}
      </Button>
      <Button variant="ghost" size="large" onClick={onCreatePage}>
        <Plus
          className="tiptap-button-icon"
          style={{
            background: "var(--tt-button-active-bg-color-subdued)",
            borderRadius: "var(--tt-radius-xl)",
          }}
        />
        <Spacer orientation="horizontal" size={3} />
        <span className="tiptap-button-text">{t("page.newPage")}</span>
      </Button>
    </CardItemGroup>
  );
});

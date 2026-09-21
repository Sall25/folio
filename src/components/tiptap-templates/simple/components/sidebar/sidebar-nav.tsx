import { memo } from "react";
import { Search, Home, Plus } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { InboxIcon } from "src/components/tiptap-icons";
import { useSearch } from "../../context/search-context";
import { useNotificationState } from "src/components/tiptap-ui/notification/notification-context";
import { useLocation, useNavigate } from "@tanstack/react-location";
import { useTranslation } from "react-i18next";
import { useCreatePage } from "src/hooks/use-create-page";
import { useActivePage } from "../../context/active-page-context";
import { useCurrentPerson } from "src/hooks/use-session";
import { makePage } from "src/utils/make-page";
import { useIsMobile } from "src/hooks/use-breakpoint";
import { useEditorLayout } from "../../context/editor-layout-context";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { InboxPanel } from "../inbox-panel";
import { useCurrentWorkspace } from "src/hooks/use-workspaces";

export const SidebarNav = memo(() => {
  const { open, onOpenChange } = useSearch();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const { unreadCount } = useNotificationState();
  const createPage = useCreatePage();
  const { setActivePageId, activePageId } = useActivePage();
  const { person } = useCurrentPerson();
  const isMobile = useIsMobile();
  const { onCollapsedChange } = useEditorLayout();
  const isHomeActive = location.current.pathname === "/";
  const { workspaceId } = useCurrentWorkspace();

  const onCreatePage = () => {
    if (!person || !workspaceId) return;
    const newPage = makePage({
      title: t("page.newPage"),
      parentId: null,
      category: "Private",
      ownerId: person.id,
      workspaceId,
    });
    createPage
      .mutateAsync(newPage)
      .then((created) => {
        setActivePageId(created.id);
        onCollapsedChange(isMobile);
      })
      .catch(() => {
        if (activePageId) setActivePageId(activePageId);
      });
  };

  const handleHomeClick = () => {
    navigate({ to: "/" });
    onCollapsedChange(isMobile);
  };

  const handleInboxClick = () => {
    if (isMobile) {
      navigate({ to: "/inbox" });
      onCollapsedChange(isMobile);
    }
  };

  const handleSearchClick = () => {
    onOpenChange?.(true);
    onCollapsedChange(isMobile);
  };

  // Icon + badge, anchored together — same pattern .workspace-notification-badge
  // already uses off .workspace-icon-button, instead of the old
  // page-level-fixed-offset approach that made the badge land near whichever
  // element happened to sit at that (top, left) regardless of which button
  // actually rendered it.
  const inboxBadge = unreadCount > 0 && (
    <>
      <Spacer orientation="horizontal" size={3} />
      <span className="sidebar-inbox-badge">{unreadCount}</span>
    </>
  );

  return (
    <CardItemGroup>
      <Button
        data-highlighted={open}
        variant="ghost"
        size="large"
        onClick={handleSearchClick}
        className="sidebar-nav-item"
      >
        <Search className="tiptap-button-icon" />
        <Spacer orientation="horizontal" size={3} />
        <span
          className="tiptap-button-text"
          style={{ opacity: 1, display: "block" }}
        >
          {t("sidebar.search")}
        </span>
      </Button>
      <Button
        onClick={handleHomeClick}
        variant="ghost"
        size="large"
        className="sidebar-nav-item"
        data-active-state={isHomeActive ? "on" : "off"}
      >
        <Home className="tiptap-button-icon" />
        <Spacer orientation="horizontal" size={3} />
        <span
          className="tiptap-button-text"
          style={{ opacity: 1, display: "block" }}
        >
          {t("sidebar.home")}
        </span>
      </Button>
      {isMobile ? (
        <Button
          key={"button"}
          variant="ghost"
          size="large"
          className="sidebar-nav-item"
          onClick={handleInboxClick}
        >
          <InboxIcon className="tiptap-button-icon" />
          <Spacer orientation="horizontal" size={3} />
          <span
            className="tiptap-button-text"
            style={{ opacity: 1, display: "block" }}
          >
            {t("sidebar.inbox")}
          </span>
          {inboxBadge}
        </Button>
      ) : (
        <Popover key={"popover"}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="large" className="sidebar-nav-item">
              <InboxIcon className="tiptap-button-icon" />
              <Spacer orientation="horizontal" size={3} />
              <span
                className="tiptap-button-text"
                style={{ opacity: 1, display: "block" }}
              >
                {t("sidebar.inbox")}
              </span>
              {inboxBadge}
            </Button>
          </PopoverTrigger>
          <PopoverPortal container={document.getElementById("root")}>
            <PopoverContent
              side="right"
              alignOffset={6}
              align="center"
              style={{ zIndex: 999 }}
            >
              <Card
                style={{
                  height: "100vh",
                  minWidth: 300,
                  borderTopLeftRadius: 0,
                  borderBottomLeftRadius: 0,
                }}
              >
                <InboxPanel />
              </Card>
            </PopoverContent>
          </PopoverPortal>
        </Popover>
      )}
      <Button
        variant="ghost"
        size="large"
        className="sidebar-nav-item"
        onClick={onCreatePage}
      >
        <Plus
          className="tiptap-button-icon"
          style={{
            background: "var(--tt-button-active-bg-color-subdued)",
            borderRadius: "var(--tt-radius-xl)",
          }}
        />
        <Spacer orientation="horizontal" size={3} />
        <span
          className="tiptap-button-text"
          style={{ opacity: 1, display: "block" }}
        >
          {t("page.newPage")}
        </span>
      </Button>
    </CardItemGroup>
  );
});

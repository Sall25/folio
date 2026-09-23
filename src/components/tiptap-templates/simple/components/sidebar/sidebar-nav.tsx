import { memo, useState } from "react";
import { Home, Plus, Users2 } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { InboxIcon } from "src/components/tiptap-icons";
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
import { TeamspacesPanel } from "../teamspaces-panel/teamspaces-panel";
import { CreateTeamspaceModal } from "../create-teamspace-modal";
import { useCurrentWorkspace } from "src/hooks/use-workspaces";
import { spaceHomePath, useCurrentSpace } from "src/hooks/use-current-space";

export const SidebarNav = memo(() => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const { unreadCount } = useNotificationState();
  const createPage = useCreatePage();
  const { setActivePageId, activePageId } = useActivePage();
  const { person } = useCurrentPerson();
  const isMobile = useIsMobile();
  const { onCollapsedChange } = useEditorLayout();
  const { workspaceId } = useCurrentWorkspace();
  const space = useCurrentSpace();

  const [teamspacesOpen, setTeamspacesOpen] = useState(false);
  const [createTeamspaceOpen, setCreateTeamspaceOpen] = useState(false);

  const teamspaceId = space.kind === "teamspace" ? space.id : null;
  const homePath = spaceHomePath(teamspaceId);
  const isHomeActive = location.current.pathname === homePath;

  const onCreatePage = () => {
    if (!person || !workspaceId) return;
    const newPage =
      space.kind === "teamspace"
        ? makePage({
            title: t("page.newPage"),
            parentId: space.id,
            category: "Teamspaces",
            ownerId: person.id,
            workspaceId: space.page?.workspaceId ?? workspaceId,
            teamspaceId: space.id,
          })
        : makePage({
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
    navigate({ to: homePath });
    onCollapsedChange(isMobile);
  };

  const handleInboxClick = () => {
    if (isMobile) {
      navigate({ to: "/inbox" });
      onCollapsedChange(isMobile);
    }
  };

  const inboxBadge = unreadCount > 0 && (
    <>
      <Spacer orientation="horizontal" size={3} />
      <span className="sidebar-inbox-badge">{unreadCount}</span>
    </>
  );

  return (
    <CardItemGroup>
      <Button
        onClick={handleHomeClick}
        variant="ghost"
        size="large"
        className="sidebar-nav-item"
        data-highlighted={isHomeActive}
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

      <Popover open={teamspacesOpen} onOpenChange={setTeamspacesOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="large"
            className="sidebar-nav-item"
            data-highlighted={teamspacesOpen}
          >
            <Users2 className="tiptap-button-icon" />
            <Spacer orientation="horizontal" size={3} />
            <span
              className="tiptap-button-text"
              style={{ opacity: 1, display: "block" }}
            >
              {t("teamspacesPanel.title", "Teamspaces")}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverPortal container={document.getElementById("root")}>
          <PopoverContent
            side={isMobile ? "bottom" : "right"}
            align="start"
            sideOffset={8}
            style={{ zIndex: 999 }}
          >
            <Card style={{ width: isMobile ? "calc(100vw - 32px)" : 300 }}>
              <TeamspacesPanel
                onDone={() => {
                  setTeamspacesOpen(false);
                  if (isMobile) onCollapsedChange(true);
                }}
                onCreate={() => {
                  setTeamspacesOpen(false);
                  setCreateTeamspaceOpen(true);
                }}
              />
            </Card>
          </PopoverContent>
        </PopoverPortal>
      </Popover>

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

      {createTeamspaceOpen && (
        <CreateTeamspaceModal
          onClose={() => setCreateTeamspaceOpen(false)}
          onCreated={(pageId) => {
            navigate({ to: `/t/${pageId}` });
            onCollapsedChange(isMobile);
          }}
        />
      )}
    </CardItemGroup>
  );
});

import { useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Home, LayoutTemplate, Plus } from "lucide-react";
import { Button, ButtonGroup } from "src/components/tiptap-ui-primitive/button";
import { Card, CardBody } from "src/components/tiptap-ui-primitive/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "src/components/tiptap-ui-primitive/dropdown-menu";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { ToolbarGroup } from "src/components/tiptap-ui-primitive/toolbar";
import { useRecentPages } from "src/hooks/use-pages";
import { useCurrentSpace } from "src/hooks/use-current-space";
import { useActivePageActions } from "../pages/context/active-page-context";
import { PageItemIcon } from "../pages/page-item/page-item-icon";
import { HomeSearch } from "./home-search";
import { useHomeActions } from "./use-home-actions";
import "./home-toolbar.scss";

// The app toolbar on the home view: Home / teamspace / today's date on the
// left, search-or-create in the middle, start from a template and New page on
// the right.
//   • `leading`: what the shell puts first (the sidebar toggle when collapsed).
//   • tablet: no date, icon-only buttons.
//   • mobile: no date, no search box (the sidebar's Search is there), icons.
export function HomeToolbar({
  leading,
  size = "desktop",
}: {
  leading?: ReactNode;
  size?: "desktop" | "tablet" | "mobile";
}) {
  const compact = size !== "desktop";
  // Three columns: crumbs | search | actions. The two sides share the free
  // space equally, so the search sits in the middle of the toolbar.
  return (
    <>
      <ToolbarGroup className="home-toolbar__side">
        {leading}
        <HomeCrumbs showDate={!compact} />
      </ToolbarGroup>
      {size !== "mobile" ? (
        <div className="home-toolbar__center">
          <HomeToolbarSearch />
        </div>
      ) : (
        <Spacer />
      )}
      <ToolbarGroup className="home-toolbar__side home-toolbar__actions">
        <HomeActions compact={compact} />
      </ToolbarGroup>
    </>
  );
}

function HomeCrumbs({ showDate }: { showDate: boolean }) {
  const { t, i18n } = useTranslation();
  const space = useCurrentSpace();
  const today = new Date().toLocaleDateString(i18n.language, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <nav className="home-crumbs" aria-label={t("sidebar.home")}>
      <span className="home-crumbs__crumb home-crumbs__crumb--home">
        <Home size={16} strokeWidth={2} aria-hidden />
        {t("sidebar.home")}
      </span>
      {space.kind === "teamspace" && (
        <>
          <span className="home-crumbs__sep" aria-hidden>
            /
          </span>
          <span className="home-crumbs__crumb">
            {space.page && (
              <PageItemIcon
                cover={space.page.cover}
                styles={{ width: 14, height: 14, fontSize: 14 }}
              />
            )}
            <span className="home-crumbs__name">
              {space.page?.title || t("teamspaces.untitled")}
            </span>
          </span>
        </>
      )}
      {showDate && (
        <>
          <span className="home-crumbs__sep" aria-hidden>
            /
          </span>
          <span className="home-crumbs__date">{today}</span>
        </>
      )}
    </nav>
  );
}

// Searches the current space's pages (a teamspace's, or all of yours).
function HomeToolbarSearch() {
  const { data } = useRecentPages();
  const space = useCurrentSpace();
  const { setActivePageId } = useActivePageActions();
  const { newPage } = useHomeActions();
  const teamspaceId = space.kind === "teamspace" ? space.id : null;

  const pages = useMemo(
    () =>
      (data ?? []).filter(
        (p) =>
          p.category !== "Template" &&
          (teamspaceId == null ||
            (p.teamspaceId === teamspaceId && p.id !== teamspaceId)),
      ),
    [data, teamspaceId],
  );

  return (
    <HomeSearch
      pages={pages}
      onOpen={(p) => setActivePageId(p.id)}
      onCreate={newPage}
    />
  );
}

function HomeActions({ compact }: { compact: boolean }) {
  const { t } = useTranslation();
  const { newPage, applyTemplate, templates, cloning } = useHomeActions();
  const templateLabel = t("home.actions.template");
  const newLabel = t("home.newPage");

  return (
    <>
      {templates.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              aria-label={compact ? templateLabel : undefined}
              tooltip={compact ? templateLabel : undefined}
              disabled={cloning}
            >
              <LayoutTemplate className="tiptap-button-icon" />
              {!compact && (
                <>
                  <span className="tiptap-button-text">{templateLabel}</span>
                  <ChevronDown className="tiptap-button-dropdown-small" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" portal>
            <Card>
              <CardBody>
                <ButtonGroup>
                  {templates.map((tpl) => (
                    <DropdownMenuItem key={tpl.id} asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => applyTemplate(tpl)}
                      >
                        <PageItemIcon
                          cover={tpl.cover}
                          styles={{ width: 16, height: 16, fontSize: 16 }}
                        />
                        <span className="tiptap-button-text">
                          {tpl.title || t("page.untitled")}
                        </span>
                      </Button>
                    </DropdownMenuItem>
                  ))}
                </ButtonGroup>
              </CardBody>
            </Card>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <Button
        type="button"
        variant="primary"
        aria-label={compact ? newLabel : undefined}
        tooltip={compact ? newLabel : undefined}
        onClick={() => newPage()}
      >
        <Plus className="tiptap-button-icon" />
        {!compact && <span className="tiptap-button-text">{newLabel}</span>}
      </Button>
    </>
  );
}

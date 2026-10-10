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
import { PageItemIcon } from "../pages/page-item/page-item-icon";
import { useCurrentSpace } from "src/hooks/use-current-space";
import { useHomeActions } from "./use-home-actions";
import "./home-toolbar-actions.scss";

// The home view's breadcrumb in the app toolbar: Home, the teamspace you're
// in (if any), and today's date. `compact` drops the date (tablet / mobile).
export function HomeToolbarCrumbs({ compact = false }: { compact?: boolean }) {
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
      {!compact && (
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

// The home view's actions in the app toolbar: start from a template (a menu
// of them) and New page. `compact` shows icons only (tablet / mobile).
export function HomeToolbarActions({ compact = false }: { compact?: boolean }) {
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

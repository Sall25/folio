import { useMemo, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useEditorState, type Editor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import type { Page, ViewType } from "src/types";
import {
  PsBoardIcon,
  PsCalendarIcon,
  PsChevronRightIcon,
  PsGalleryIcon,
  PsListIcon,
  PsTableIcon,
  PsTemplateIcon,
  PsGraphIcon,
  PsTimelineIcon,
} from "src/components/tiptap-icons/page-starter-icons";
import { Button, ButtonGroup } from "src/components/tiptap-ui-primitive/button";
import { Card, CardBody } from "src/components/tiptap-ui-primitive/card";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "src/components/tiptap-ui-primitive/dropdown-menu";
import { useTemplates } from "src/hooks/use-templates";
import { useTemplates as useTemplatesGallery } from "src/features/pages/templates/templates-context";
import { useCurrentSpace } from "src/hooks/use-current-space";
import { usePageCapabilities } from "src/hooks/use-page-role";
import { usePatchPage } from "src/hooks/use-patch-page";
import { patchPage as patchPageApi } from "src/api/pages";
import { PageItemIcon } from "src/features/pages/page-item/page-item-icon";
import { useActivePageState } from "src/features/pages/context/active-page-context";
import { stripPageComments } from "src/features/comments/page-comment-node/use-page-comment";
import { useEditorSync } from "../context/editor-sync-context";
import { pageBodyStart, starterPosition } from "./new-page-starter-extension";
import { usePageToDatabase } from "./use-page-to-database";
import "./new-page-starter.scss";

const ICON = { size: 16, strokeWidth: 1.8 } as const;

const VIEWS: { type: ViewType; icon: ReactNode }[] = [
  { type: "table", icon: <PsTableIcon {...ICON} /> },
  { type: "board", icon: <PsBoardIcon {...ICON} /> },
  { type: "list", icon: <PsListIcon {...ICON} /> },
  { type: "gallery", icon: <PsGalleryIcon {...ICON} /> },
  { type: "calendar", icon: <PsCalendarIcon {...ICON} /> },
  { type: "timeline", icon: <PsTimelineIcon {...ICON} /> },
  { type: "graph", icon: <PsGraphIcon {...ICON} /> },
];

// Keep the editor's focus and selection when a row is pressed.
const keepEditorFocus = (e: MouseEvent) => e.preventDefault();

// What a fresh page can become, under its title (Notion-style): continue
// with an empty page (Enter), start from a template, or make the page a
// database (full page, not an inline block) opening in the picked view. Shown while the page has nothing below the
// title and the cursor is in the title; the extension places the slot,
// this fills it. Editors only, never on locked pages.
export function NewPageStarter({ editor }: { editor: Editor }) {
  const { activePage } = useActivePageState();
  const { isSyncing } = useEditorSync();
  const { canEditContent, isLoading } = usePageCapabilities(activePage?.id);

  const atStart = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      !!e &&
      e.storage.structuredPageGuard?.isStructuredActivePage?.() !== true &&
      starterPosition(e.state) !== null,
  });

  const slot = editor.storage.newPageStarter?.slot ?? null;
  const show =
    atStart &&
    !!slot &&
    !!activePage &&
    !activePage.settings.locked &&
    canEditContent &&
    !isLoading &&
    !isSyncing;

  if (!show || !slot || !activePage) return null;
  return createPortal(<StarterRows editor={editor} page={activePage} />, slot);
}

function StarterRows({ editor, page }: { editor: Editor; page: Page }) {
  const { t } = useTranslation();

  const toDatabase = usePageToDatabase(editor, page);
  const addDatabase = (type: ViewType) =>
    void toDatabase(type, t(`database.views.${type}`));

  return (
    <div className="new-page-starter" onMouseDown={keepEditorFocus}>
      <p className="new-page-starter__hint">
        {t("pageStarter.hintBefore")}{" "}
        <kbd className="new-page-starter__kbd">{t("pageStarter.enter")}</kbd>{" "}
        {t("pageStarter.hintAfter")}
      </p>

      <TemplatesRow editor={editor} page={page} />

      <div className="new-page-starter__label">{t("pageStarter.database")}</div>
      {VIEWS.map(({ type, icon }) => (
        <button
          key={type}
          type="button"
          className="new-page-starter__row"
          onClick={() => addDatabase(type)}
        >
          <span className="new-page-starter__icon">{icon}</span>
          <span className="new-page-starter__name">
            {t(`database.views.${type}`)}
          </span>
        </button>
      ))}
    </div>
  );
}

// Templates ›: the space's templates; picking one fills THIS page (its body,
// plus its title when the page has none yet, and its icon/cover).
function TemplatesRow({ editor, page }: { editor: Editor; page: Page }) {
  const { t } = useTranslation();
  const { data: templates } = useTemplates();
  const { onOpenChange: openGallery } = useTemplatesGallery();
  const space = useCurrentSpace();
  const teamspaceId = space.kind === "teamspace" ? space.id : null;
  const patchPage = usePatchPage(({ id, patch }) => patchPageApi(id, patch));

  const inSpace = useMemo(
    () =>
      ((templates ?? []) as Page[]).filter((tpl) =>
        teamspaceId ? tpl.teamspaceId === teamspaceId : tpl.teamspaceId == null,
      ),
    [templates, teamspaceId],
  );

  const apply = (tpl: Page) => {
    const at = pageBodyStart(editor.state.doc);
    if (at === null) return;

    const content = stripPageComments(
      structuredClone(tpl.content),
    ) as JSONContent | null;
    const body = (content?.content ?? []).filter(
      (n) => n.type !== "title" && n.type !== "recordPropertyPanel",
    );
    const titleEmpty = editor.state.doc.firstChild?.content.size === 0;
    const title = tpl.title?.trim();

    let chain = editor
      .chain()
      .insertContentAt(
        { from: at, to: editor.state.doc.content.size },
        body.length > 0 ? body : [{ type: "paragraph" }],
      );
    if (titleEmpty && title) {
      chain = chain.insertContentAt(1, { type: "text", text: title });
    }
    chain.focus().run();

    const hasLook = Boolean(tpl.cover.iconName || tpl.cover.coverImage);
    patchPage.mutate({
      id: page.id,
      patch: {
        ...(hasLook ? { cover: structuredClone(tpl.cover) } : {}),
        settings: {
          ...page.settings,
          width: tpl.settings.width,
          text: tpl.settings.text,
        },
      },
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="new-page-starter__row">
          <span className="new-page-starter__icon">
            <PsTemplateIcon {...ICON} />
          </span>
          <span className="new-page-starter__name">
            {t("pageStarter.templates")}
          </span>
          <span className="new-page-starter__chevron">
            <PsChevronRightIcon size={14} strokeWidth={1.8} />
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="right"
        align="start"
        sideOffset={6}
        collisionPadding={8}
        portal
      >
        <Card className="new-page-starter-menu">
          <CardBody>
            <div className="new-page-starter-menu__label">
              {t("pageStarter.templatesInSpace")}
            </div>
            <ButtonGroup>
              {inSpace.length === 0 && (
                <div className="new-page-starter-menu__empty">
                  {t("pageStarter.noTemplates")}
                </div>
              )}
              {inSpace.map((tpl) => (
                <DropdownMenuItem key={tpl.id} asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => apply(tpl)}
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
            <Separator orientation="horizontal" />
            <DropdownMenuItem asChild>
              <Button
                type="button"
                variant="ghost"
                className="new-page-starter-menu__browse"
                onClick={() => openGallery?.(true)}
              >
                <span className="tiptap-button-text">
                  {t("templates.browseAll")}
                </span>
              </Button>
            </DropdownMenuItem>
          </CardBody>
        </Card>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

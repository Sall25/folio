import { useTranslation } from "react-i18next";
import { Button, ButtonGroup } from "src/components/tiptap-ui-primitive/button";
import { Card } from "src/components/tiptap-ui-primitive/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Plus, PencilIcon, Trash2, ImageIcon } from "src/components/icons";
import { TbDots } from "src/components/tiptap-icons/tabler-icons";
import { SB_ICON_SM } from "../../shell/sidebar/sidebar-icon";
import type { Page } from "src/types";
import { useActivePage } from "../context/active-page-context";
import { useCreatePage } from "src/hooks/use-create-page";
import { useRecentPages } from "src/hooks/use-pages";
import { makeChildPage } from "src/utils/make-page";
//import { usePageCapabilities } from "src/hooks/use-page-role";
import { useTrashPage } from "src/hooks/use-trash-page";
import { useState } from "react";
import {
  useCurrentWorkspace,
  useManageWorkspace,
} from "src/hooks/use-workspaces";
import { useCurrentPerson } from "src/hooks/use-session";
import { canBeWorkspaceBanner } from "src/lib/banner-page";
import { TeamspacePlacementMenu } from "src/features/workspace/teamspaces/teamspace-placement-menu";

interface PageItemOptionsProps {
  page: Page;
  onRenameAsync: () => Promise<void>;
  /** Told when the menu opens and closes (the row keeps its buttons shown
   *  while it's open). */
  onOpenChange: (v: boolean) => void;
  /** Rename, add a page, banner and trash need edit rights; a teamspace's
   *  "Show in" doesn't (it's your own sidebar). Defaults to true. */
  canEdit?: boolean;
}

export function PageItemOptions({
  page,
  onRenameAsync,
  onOpenChange,
  canEdit = true,
}: PageItemOptionsProps) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { setActivePageId, activePageId } = useActivePage();
  const createPage = useCreatePage();

  //const { canDeletePage } = usePageCapabilities(activePageId);

  const { data: recentPages } = useRecentPages();

  const { mutate: trashPage } = useTrashPage();
  const { workspaceId, workspace } = useCurrentWorkspace();
  const { person } = useCurrentPerson();
  const { setSettingAsync } = useManageWorkspace();

  const isBanner = workspace?.settings.bannerPageId === page.id;
  const canSetBanner =
    person?.role === "owner" && canBeWorkspaceBanner(page, workspaceId);

  const toggleBanner = () => {
    if (!workspaceId) return;
    void setSettingAsync(
      workspaceId,
      "bannerPageId",
      isBanner ? null : page.id,
    );
  };

  const handleDeletePage = () => {
    // Deleting the page we're on: navigate away FIRST so the editor never
    // lingers on the doomed page, then fire the mutation.
    if (page.id === activePageId) {
      const fallback = recentPages?.find((p) => p.id !== page.id);
      if (fallback) {
        setActivePageId(fallback.id);
      }
    }
    if (!workspaceId) return;
    trashPage({ pageId: page.id, workspaceId });
  };

  // if (!canDeletePage) return null; TODO: NEEDS FIXING

  // Picking an item closes the menu, and tells the row.
  const close = () => {
    setMenuOpen(false);
    onOpenChange(false);
  };

  if (!menuOpen) {
    return (
      <Button
        variant="ghost"
        className="page-options-btn"
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen(true);
          onOpenChange(true);
        }}
        tooltip={"Options"}
      >
        <TbDots {...SB_ICON_SM} className="tiptap-button-icon" />
      </Button>
    );
  }

  return (
    <>
      <Popover
        open
        onOpenChange={(v) => {
          setMenuOpen(v);
          onOpenChange(v);
        }}
      >
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="page-options-btn"
            onClick={(e) => e.stopPropagation()}
          >
            <TbDots {...SB_ICON_SM} className="tiptap-button-icon" />
          </Button>
        </PopoverTrigger>
        <PopoverContent style={{ zIndex: 9555 }}>
          <Card style={{ padding: "5px" }} className="page-item-options-card">
            <ButtonGroup
              style={{
                minWidth: 150,
                width: "100%",
                justifyContent: "flex-start",
              }}
              orientation="vertical"
            >
              {canEdit && (
                <>
              <Button
                variant="ghost"
                style={{
                  width: "100%",
                  justifyContent: "flex-start",
                  gap: 10,
                }}
                onClick={async (e) => {
                  e.stopPropagation();
                  close();
                  await onRenameAsync();
                }}
              >
                <PencilIcon className="tiptap-button-icon" />
                <span className="tiptap-button-text">
                  {t("actions.rename")}
                </span>
              </Button>

              <Button
                variant="ghost"
                style={{
                  width: "100%",
                  justifyContent: "flex-start",
                  gap: 10,
                }}
                onClick={async (e) => {
                  e.stopPropagation();
                  const child = makeChildPage(page, t("page.newPage"));
                  createPage.mutate(child);
                  setActivePageId(child.id);
                  close();
                }}
              >
                <Plus className="tiptap-button-icon" />
                <span className="tiptap-button-text">
                  {t("ui.addPageInside")}
                </span>
              </Button>

                </>
              )}

              {canEdit && (canSetBanner || isBanner) && (
                <Button
                  variant="ghost"
                  style={{
                    width: "100%",
                    justifyContent: "flex-start",
                    gap: 10,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleBanner();
                    close();
                  }}
                >
                  <ImageIcon className="tiptap-button-icon" />
                  <span className="tiptap-button-text">
                    {isBanner
                      ? t("ui.removeHomeBanner")
                      : t("ui.useAsHomeBanner")}
                  </span>
                </Button>
              )}

              {page.teamspaceId === page.id && (
                <TeamspacePlacementMenu teamspaceId={page.id} />
              )}

              {canEdit && (
              <Button
                variant="ghost"
                style={{
                  width: "100%",
                  justifyContent: "flex-start",
                  gap: 10,
                }}
                className="tiptap-button-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeletePage();
                  close();
                }}
              >
                <Trash2 className="tiptap-button-icon" />
                <span className="tiptap-button-text">
                  {t("ui.moveToTrash")}
                </span>
              </Button>
              )}
            </ButtonGroup>
          </Card>
        </PopoverContent>
      </Popover>
    </>
  );
}

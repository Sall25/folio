import { Ellipsis } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";

import "./more-popover.scss";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { SettingsToggleButton } from "src/components/tiptap-ui/settings-toggle-button";
import { ExportButtons } from "src/components/tiptap-ui/export-buttons/export-buttons";
import { useCallback, useState } from "react";
import { useActivePageState } from "../pages/context/active-page-context";
import { usePatchPage } from "src/hooks/use-patch-page";
import { patchPage } from "src/api/pages";
import { PageTemplateMenu } from "../pages/templates/page-template-menu";
import { UndoRedoButton } from "src/components/tiptap-ui/undo-redo-button";
import { ThemeToggle } from "src/features/shell/theme-toggle";
import { NotificationBell } from "src/features/inbox/notification";
import EditedTimeButton from "../pages/edited-time-button/edited-time-button";
import { PageCategorySelect } from "../pages/page-category-select";
import type { ID, Page, PageCategory } from "src/types";
import { ShortcutsButton } from "src/components/tiptap-ui/shortcut-sheet";
import { useTranslation } from "react-i18next";
import { useAvailableOffline } from "../pages/available-offline";

export function MorePopover({
  includeUndoRedo = false,
  includeTheme = false,
  includeNotifications = false,
  editedPage,
  category,
}: {
  includeUndoRedo?: boolean;
  includeTheme?: boolean;
  includeNotifications?: boolean;
  /** When set, the edited-time row renders here (folded off the bar). */
  editedPage?: Page | null;
  /** When set, the category selector renders here (mobile). */
  category?: {
    value: PageCategory;
    onChange: (category: PageCategory) => void;
    teamspaceId?: ID | null;
    onMoveToTeamspace?: (teamspaceId: ID) => void;
    locked?: boolean;
  };
}) {
  const mutatePage = usePatchPage(({ id, patch }) => patchPage(id, patch));
  const { activePage } = useActivePageState();
  const [fullWidth, setFullWidth] = useState<boolean>(
    activePage?.settings.width === "full",
  );
  const [smallText, setSmallText] = useState<boolean>(
    activePage?.settings.text === "small",
  );
  const [locked, setLocked] = useState<boolean>(
    activePage?.settings.locked === true,
  );
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const offline = useAvailableOffline(activePage);
  const offlineLabel = !offline
    ? ""
    : offline.locked
      ? offline.by === "favorites"
        ? t("offline.keep.viaFavorites")
        : t("offline.keep.viaTeamspace")
      : offline.isTeamspaceRoot
        ? t("offline.keep.teamspace")
        : t("offline.keep.page");

  const onFullWidthChangeAsync = useCallback(
    async (checked: boolean) => {
      if (!activePage) return;

      setFullWidth(checked);
      await mutatePage.mutateAsync({
        id: activePage.id,
        patch: {
          settings: {
            ...activePage.settings,
            width: checked ? "full" : "medium",
          },
        },
      });
    },
    [activePage, mutatePage],
  );

  const onSmallTextChangeAsync = useCallback(
    async (checked: boolean) => {
      if (!activePage) return;

      setSmallText(checked);

      await mutatePage.mutateAsync({
        id: activePage.id,
        patch: {
          settings: {
            ...activePage.settings,
            text: checked ? "small" : "normal",
          },
        },
      });
    },
    [activePage, mutatePage],
  );

  const onLockedChangeAsync = useCallback(
    async (checked: boolean) => {
      if (!activePage) return;

      setLocked(checked);

      await mutatePage.mutateAsync({
        id: activePage.id,
        patch: { settings: { ...activePage.settings, locked: checked } },
      });
    },
    [activePage, mutatePage],
  );

  // Whether the overflow section has anything to show at this breakpoint.
  const hasOverflow =
    includeUndoRedo ||
    includeTheme ||
    includeNotifications ||
    !!editedPage ||
    !!category;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="large">
          <Ellipsis className="tiptap-button-icon" />
        </Button>
      </PopoverTrigger>
      <PopoverPortal container={document.getElementById("#root")}>
        <PopoverContent
          style={{ position: "fixed", zIndex: 9999 }}
          align="center"
          side="bottom"
        >
          <Card className="more-content">
            {/* Overflow section — controls folded off the bar on tablet/mobile.
                Renders nothing on desktop, where these live on the toolbar. */}
            {hasOverflow && (
              <>
                <CardItemGroup className="more-item">
                  {category && <PageCategorySelect {...category} />}

                  {editedPage && <EditedTimeButton page={editedPage} />}

                  {includeUndoRedo && (
                    <div className="more-inline-row">
                      <UndoRedoButton action="undo" />
                      <UndoRedoButton action="redo" />
                    </div>
                  )}

                  {includeNotifications && <NotificationBell />}

                  {includeTheme && <ThemeToggle />}
                </CardItemGroup>
                <Separator orientation="horizontal" />
              </>
            )}

            <CardItemGroup className="more-item">
              <SettingsToggleButton
                target="width"
                text="Full Width"
                onChangedAsync={onFullWidthChangeAsync}
                checked={fullWidth}
              />
              <SettingsToggleButton
                target="text"
                text="Small Text"
                onChangedAsync={onSmallTextChangeAsync}
                checked={smallText}
              />
              <SettingsToggleButton
                target="lock"
                text="Lock Page"
                onChangedAsync={onLockedChangeAsync}
                checked={locked}
              />
              {offline && (
                <SettingsToggleButton
                  target="offline"
                  text={offlineLabel}
                  checked={offline.kept}
                  disabled={offline.locked}
                  onChangedAsync={async (on) => offline.set(on)}
                />
              )}
            </CardItemGroup>
            <Separator orientation="horizontal" />
            <CardItemGroup className="more-item">
              <PageTemplateMenu />
              <ExportButtons documentTitle={activePage?.title || undefined} />
              <ShortcutsButton onOpen={() => setOpen(false)} />
            </CardItemGroup>
          </Card>
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
}

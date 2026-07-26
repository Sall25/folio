import { Ellipsis, Timer } from "lucide-react";
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
import { useActivePage } from "./context/active-page-context";
import { usePatchPage } from "src/hooks/use-patch-page";
import { patchPage } from "src/api/pages";
import { PageTemplateMenu } from "./components/page-template-menu";
import { UndoRedoButton } from "src/components/tiptap-ui/undo-redo-button";
import { ThemeToggle } from "src/components/tiptap-templates/simple/theme-toggle";
import { NotificationBell } from "src/components/tiptap-ui/notification";
import EditedTimeButton from "./components/edited-time-button/edited-time-button";
import { PageCategorySelect } from "./components/page-category-select";
import type { Page, PageCategory } from "src/types";

export function MorePopover({
  onTriggerVersionHistory,
  // Overflow flags — set by the tablet/mobile toolbars so controls hidden from
  // the bar render inside the popover instead. Absent on desktop (those
  // controls stay on the bar), so this whole section renders nothing there.
  includeUndoRedo = false,
  includeTheme = false,
  includeNotifications = false,
  editedPage,
  category,
}: {
  onTriggerVersionHistory?: () => void;
  includeUndoRedo?: boolean;
  includeTheme?: boolean;
  includeNotifications?: boolean;
  /** When set, the edited-time row renders here (folded off the bar). */
  editedPage?: Page | null;
  /** When set, the category selector renders here (mobile). */
  category?: {
    value: PageCategory;
    onChange: (category: PageCategory) => void;
  };
}) {
  const mutatePage = usePatchPage(({ id, patch }) => patchPage(id, patch));
  const { activePage } = useActivePage();
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
        <Button variant="ghost">
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
                  {category && (
                    <PageCategorySelect
                      value={category.value}
                      onChange={category.onChange}
                    />
                  )}

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
            </CardItemGroup>
            <Separator orientation="horizontal" />
            <CardItemGroup className="more-item">
              <PageTemplateMenu />
              <ExportButtons documentTitle="First Document" />
              <Button
                className="version-history-btn"
                variant="ghost"
                onClick={() => {
                  setOpen(false);
                  onTriggerVersionHistory?.();
                }}
              >
                <Timer className="tiptap-button-icon" />
                <span>Version History</span>
              </Button>
            </CardItemGroup>
          </Card>
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
}

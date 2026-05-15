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
import { useActivePage } from "./use-active-page";
export function MorePopover({
  onTriggerVersionHistory,
}: {
  onTriggerVersionHistory?: () => void;
}) {
  const { activePage, updateSettingsAsync } = useActivePage();
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

      await updateSettingsAsync({
        ...activePage.settings,
        width: checked ? "full" : "medium",
      });
    },
    [activePage, updateSettingsAsync],
  );

  const onSmallTextChangeAsync = useCallback(
    async (checked: boolean) => {
      if (!activePage) return;

      setSmallText(checked);

      await updateSettingsAsync({
        ...activePage.settings,
        text: checked ? "small" : "normal",
      });
    },
    [activePage, updateSettingsAsync],
  );

  const onLockedChangeAsync = useCallback(
    async (checked: boolean) => {
      if (!activePage) return;

      setLocked(checked);

      await updateSettingsAsync({ ...activePage.settings, locked: checked });
    },
    [activePage, updateSettingsAsync],
  );

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

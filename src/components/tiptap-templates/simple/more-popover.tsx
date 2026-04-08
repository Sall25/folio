import { Ellipsis } from "lucide-react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card, CardItemGroup } from "src/components/tiptap-ui-primitive/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";

import "./more-popover.scss";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { SettingsToggleButton } from "src/components/tiptap-ui/settings-toggle-button";
import { ExportButtons } from "src/components/tiptap-ui/export-buttons/export-buttons";

interface MorePopoverProps {
  fullWidth: boolean;
  smallText: boolean;
  locked: boolean;
  onFullWidthChange: (v: boolean) => void;
  onSmallTextChange: (v: boolean) => void;
  onLockedChange: (v: boolean) => void;
}

export function MorePopover({
  fullWidth,
  smallText,
  locked,
  onFullWidthChange,
  onSmallTextChange,
  onLockedChange,
}: MorePopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost">
          <Ellipsis className="tiptap-button-icon" />
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <Card className="more-content">
          <CardItemGroup className="more-item">
            <SettingsToggleButton
              target="width"
              text="Full Width"
              onChanged={onFullWidthChange}
              checked={fullWidth}
            />
            <SettingsToggleButton
              target="text"
              text="Small Text"
              onChanged={onSmallTextChange}
              checked={smallText}
            />
            <SettingsToggleButton
              target="lock"
              text="Lock Page"
              onChanged={onLockedChange}
              checked={locked}
            />
          </CardItemGroup>
          <Separator orientation="horizontal" />
          <ExportButtons documentTitle="First Document" />
        </Card>
      </PopoverContent>
    </Popover>
  );
}

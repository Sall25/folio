// ─── OpenInFlyout ───────────────────────────────────────────────────────────
// The "Open in" submenu content: New tab (full page) and Side peek. Rendered
// inside a NavigableMenuItem flyout. Picking a mode opens the record's page that
// way and closes the menu.
import { ArrowUpRight, PanelRight } from "lucide-react";
import { MenuRow } from "../menu-row";
import { Card } from "src/components/tiptap-ui-primitive/card";

export type OpenInMode = "newTab" | "sidePeek";

export function OpenInFlyout({
  onOpen,
}: {
  /** Open the record's page in the chosen mode. */
  onOpen: (mode: OpenInMode) => void;
}) {
  return (
    <Card style={{ padding: "5px 10px", borderRadius: "var(--tt-radius-sm)" }}>
      <MenuRow
        Icon={ArrowUpRight}
        label="New tab"
        shortcut="Ctrl+⇧+↵"
        onClick={() => onOpen("newTab")}
      />
      <MenuRow
        Icon={PanelRight}
        label="Side peek"
        shortcut="Alt+Click"
        onClick={() => onOpen("sidePeek")}
      />
    </Card>
  );
}

import {
  SbCollapseIcon,
  SbExpandIcon,
} from "src/components/tiptap-icons/sidebar-icons";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  CardHeader,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import {
  useEditorLayoutActions,
  useEditorLayoutState,
} from "../context/editor-layout-context";
import { User } from "./sidebar-user";
import { SidebarFind } from "./sidebar-dock";
import { NewPageButton } from "./new-page-button";
import { isDesktopApp } from "src/lib/desktop";
import "./sidebar-tabs.scss";

// Top row: the space switcher, collapse, and New page. The find row opens
// under it while searching. The tabs and your account sit in the dock at the
// bottom (sidebar-footer).
export const SidebarHeader = memo(() => {
  const { t } = useTranslation();
  const { onCollapsedChange, collapseWithFloat } = useEditorLayoutActions();
  const { collapsed } = useEditorLayoutState();

  return (
    <CardHeader
      className="sidebar-header-content"
      style={{ border: "none", padding: 0 }}
    >
      <CardItemGroup
        style={{
          width: "100%",
          padding: "0px 5px",
          boxSizing: "border-box",
          minWidth: 0,
        }}
      >
        {/* Desktop app: the row's empty space drags the window, like the
            title bar it sits level with (desktop-title-bar.scss). */}
        <div
          className="sb-top"
          style={{ paddingTop: 4 }}
          data-tauri-drag-region={isDesktopApp ? "" : undefined}
        >
          <User />
          {/* Revealed on hover/focus of the top row (always on touch). */}
          <span className="sb-top__collapse">
            <Button
              variant="ghost"
              size="large"
              tooltip={collapsed ? t("sidebar.collapsed") : t("sidebar.expand")}
              onClick={() => {
                if (!collapsed) collapseWithFloat();
                else onCollapsedChange(!collapsed);
              }}
            >
              {collapsed ? (
                <SbExpandIcon size={18} className="tiptap-button-icon" />
              ) : (
                <SbCollapseIcon size={18} className="tiptap-button-icon" />
              )}
            </Button>
          </span>
          <NewPageButton className="sb-top__new" />
        </div>

        <SidebarFind />
        <Spacer orientation="vertical" size={4} />
      </CardItemGroup>
    </CardHeader>
  );
});

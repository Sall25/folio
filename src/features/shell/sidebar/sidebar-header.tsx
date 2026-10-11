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
import { SidebarTabs } from "./sidebar-tabs";
import { NewPageButton } from "./new-page-button";
import "./sidebar-tabs.scss";

// Top row: the space switcher, collapse, and New page. Below it the tabs
// (Home · Inbox · Chats, + search). Your account sits in the footer.
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
        <div className="sb-top" style={{ paddingTop: 4 }}>
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
                <SbExpandIcon size={15} className="tiptap-button-icon" />
              ) : (
                <SbCollapseIcon size={15} className="tiptap-button-icon" />
              )}
            </Button>
          </span>
          <NewPageButton className="sb-top__new" />
        </div>

        <Spacer orientation="vertical" size={8} />
        <SidebarTabs />
        <Spacer orientation="vertical" size={4} />
      </CardItemGroup>
    </CardHeader>
  );
});

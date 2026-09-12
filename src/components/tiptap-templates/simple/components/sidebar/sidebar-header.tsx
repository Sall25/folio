import {
  PanelLeft,
  ChevronsUpDown,
  CirclePile,
  PanelRight,
} from "lucide-react";
import { memo } from "react";
import { Button } from "src/components/tiptap-ui-primitive/button";
import {
  CardHeader,
  CardItemGroup,
} from "src/components/tiptap-ui-primitive/card";
import { Spacer } from "src/components/tiptap-ui-primitive/spacer";
import { SidebarNav } from "./sidebar-nav";
import {
  useEditorLayoutActions,
  useEditorLayoutState,
} from "../../context/editor-layout-context";
import { useTranslation } from "react-i18next";
import { Bone } from "../skeletons";
import { User } from "./sidebar-user";

const UserSkeleton = memo(() => {
  return (
    <div className="sidebar-tree-skeleton__row">
      <Bone width={13} height={13} rounded />
      <Bone width={"62%"} height={10} pill />
    </div>
  );
});
UserSkeleton.displayName = "UserSkeleton";

export const SidebarHeader = memo(() => {
  const { t } = useTranslation();
  const { onCollapsedChange, collapseWithFloat } = useEditorLayoutActions();
  const { collapsed } = useEditorLayoutState();

  return (
    <CardHeader className="sidebar-header-content" style={{ border: "none" }}>
      <CardItemGroup style={{ width: "100%", padding: "0px 5px" }}>
        <CardItemGroup orientation="horizontal" style={{ width: "100%" }}>
          <Button
            variant="ghost"
            data-highlighted="true"
            size="large"
            style={{ background: "transparent" }}
          >
            <CirclePile className="tiptap-button-icon" />
          </Button>
          <span
            style={{
              fontFamily: "Lora, serif",
              fontWeight: 500,
              fontSize: 28,
              lineHeight: 1,
              letterSpacing: -0.5,
            }}
          >
            Folio
          </span>
          <Spacer orientation="horizontal" />
          <Button
            variant="ghost"
            size="large"
            tooltip={collapsed ? t("sidebar.collapsed") : t("sidebar.expand")}
            onClick={() => {
              if (!collapsed) {
                collapseWithFloat();
              } else {
                onCollapsedChange(!collapsed);
              }
            }}
          >
            {collapsed ? (
              <PanelRight className="tiptap-button-icon" />
            ) : (
              <PanelLeft className="tiptap-button-icon" />
            )}
          </Button>
        </CardItemGroup>
        <Spacer orientation="vertical" size={20} />
        <CardItemGroup
          orientation="horizontal"
          style={{
            width: "100%",
            border: "1px solid var(--tt-border-color)",
            padding: "10px",
            borderRadius: "var(--tt-radius-md)",
          }}
        >
          <User />
          <Spacer orientation="horizontal" />
          <Button variant="ghost" size="small" style={{ borderRadius: "50%" }}>
            <ChevronsUpDown className="tiptap-button-icon" />
          </Button>
        </CardItemGroup>
        <Spacer orientation="vertical" size={10} />
        <SidebarNav />
      </CardItemGroup>
    </CardHeader>
  );
});

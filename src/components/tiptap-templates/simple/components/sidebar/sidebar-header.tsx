import { ChevronsUpDown, Search, X } from "lucide-react";
import { memo } from "react";
import { useTranslation } from "react-i18next";
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
import { Bone } from "../skeletons";
import { User } from "./sidebar-user";
import { FolioIcon } from "./folio-icon";
import { SidebarSearchInput } from "./sidebar-search-input";

import "./sidebar-switcher.scss";

import type { SVGProps } from "react";
import { requestFindFocus } from "src/lib/find-store";

interface PanelIconProps extends SVGProps<SVGSVGElement> {
  color?: string;
}

function FolioPanelLeft({ color = "currentColor", ...props }: PanelIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <rect x="4" y="4" width="6" height="16" rx="2" stroke={color} />
    </svg>
  );
}

function FolioPanelRight({ color = "currentColor", ...props }: PanelIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <rect x="15" y="4" width="6" height="16" rx="2" stroke={color} />
    </svg>
  );
}

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
  const { onCollapsedChange, collapseWithFloat, setSidebarView } =
    useEditorLayoutActions();
  const { collapsed, sidebarView } = useEditorLayoutState();
  const isSearching = sidebarView === "search";

  const toggleSearch = () => {
    if (isSearching) {
      setSidebarView("pages");
    } else {
      setSidebarView("search");
      requestAnimationFrame(() => requestFindFocus());
    }
  };

  return (
    <CardHeader className="sidebar-header-content" style={{ border: "none" }}>
      {/* border-box: width 100% + horizontal padding would otherwise be
          10px wider than the sidebar and push everything inside off the
          edge. minWidth 0 lets its flex children shrink. */}
      <CardItemGroup
        style={{
          width: "100%",
          padding: "0px 5px",
          boxSizing: "border-box",
          minWidth: 0,
        }}
      >
        <CardItemGroup
          orientation="horizontal"
          style={{ width: "100%", minWidth: 0 }}
        >
          <Button
            variant="ghost"
            data-highlighted="true"
            size="large"
            style={{ background: "transparent" }}
          >
            <FolioIcon
              className="tiptap-button-icon"
              style={{ width: 24, height: 24 }}
            />
          </Button>
          <span
            style={{
              fontFamily: "Lora, serif",
              fontWeight: 500,
              fontSize: 28,
              lineHeight: 1,
              letterSpacing: -0.5,
              color: "var(--tt-text-primary)",
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
              <FolioPanelRight
                className="tiptap-button-icon"
                color="var(--tt-text-primary)"
              />
            ) : (
              <FolioPanelLeft
                className="tiptap-button-icon"
                color="var(--tt-text-primary)"
              />
            )}
          </Button>
        </CardItemGroup>
        <Spacer orientation="vertical" size={20} />

        <div className="sidebar-switcher-row">
          <div
            className={`sidebar-switcher-stack${isSearching ? " is-searching" : ""}`}
          >
            <CardItemGroup
              orientation="horizontal"
              className="workspace-switcher sidebar-switcher-stack__switcher"
              aria-hidden={isSearching}
              style={{
                width: "100%",
                padding: "6px",
                boxSizing: "border-box",
                borderRadius: "var(--tt-radius-md)",
                border: "0.2px solid var(--tt-border-color)",
              }}
            >
              <User />
              <Spacer orientation="horizontal" />
              <Button
                variant="ghost"
                size="small"
                style={{ borderRadius: "50%" }}
              >
                <ChevronsUpDown
                  className="tiptap-button-icon"
                  style={{ color: "var(--tt-text-primary)" }}
                />
              </Button>
            </CardItemGroup>

            <div
              className="sidebar-switcher-stack__search"
              aria-hidden={!isSearching}
            >
              <SidebarSearchInput />
            </div>
          </div>

          <button
            type="button"
            className={`sidebar-find-toggle${isSearching ? " is-on" : ""}`}
            aria-label={
              isSearching
                ? t("find.close", "Close search")
                : t("find.open", "Search in pages")
            }
            title={
              isSearching
                ? t("find.close", "Close search")
                : t("find.open", "Search in pages")
            }
            aria-pressed={isSearching}
            onClick={toggleSearch}
          >
            <Search size={16} className="sidebar-find-toggle__icon is-search" />
            <X size={16} className="sidebar-find-toggle__icon is-close" />
          </button>
        </div>

        <Spacer orientation="vertical" size={10} />
        <SidebarNav />
      </CardItemGroup>
    </CardHeader>
  );
});

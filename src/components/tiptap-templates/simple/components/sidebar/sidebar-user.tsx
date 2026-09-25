import { memo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCurrentPerson } from "src/hooks/use-session";
import { useCurrentWorkspace } from "src/hooks/use-workspaces";
import { useCurrentSpace } from "src/hooks/use-current-space";
import { Bone } from "../skeletons";
import { useNotificationState } from "src/components/tiptap-ui/notification/notification-context";
import {
  Grid,
  GridCell,
  GridRow,
} from "src/components/tiptap-ui-primitive/grid";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { WorkspaceSwitcherPopover } from "../../workspace-switcher-popover";
import { DynamicIcon } from "src/components/tiptap-ui/cover/dynamic-icon";
import { PageItemIcon } from "../../page-item-icon";
import { useIsMobile } from "src/hooks/use-breakpoint";
import "./sidebar-user.scss";

const UserSkeleton = memo(() => {
  return (
    <div className="sidebar-tree-skeleton__row">
      <Bone width={13} height={13} rounded />
      <Bone width={"62%"} height={10} pill />
    </div>
  );
});
UserSkeleton.displayName = "UserSkeleton";

// Shows the CURRENT space's identity — your workspace, or the teamspace
// you've entered — and opens the space switcher.
export const User = memo(() => {
  const { t } = useTranslation();
  const { person, isLoading } = useCurrentPerson();
  const isMobile = useIsMobile();

  const { workspace } = useCurrentWorkspace();
  const space = useCurrentSpace();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const initialRef = useRef<HTMLButtonElement>(null);

  const { unreadCount } = useNotificationState();

  if (isLoading) return <UserSkeleton />;

  const iconSize = isMobile ? 15 : 18;

  let name: string;
  let glyph: React.ReactNode;

  if (space.kind === "teamspace") {
    name = space.page?.title || t("teamspaces.untitled");
    glyph = space.page ? (
      <PageItemIcon
        cover={space.page.cover}
        styles={{ width: iconSize, height: iconSize, fontSize: iconSize }}
      />
    ) : null;
  } else {
    name = workspace?.name ?? person?.name ?? "";
    const initial = name ? name.charAt(0).toUpperCase() : "?";
    if (workspace?.icon) {
      glyph =
        workspace.iconTarget === "Emoji" ? (
          <span style={{ fontSize: iconSize, lineHeight: 1 }}>
            {workspace.icon}
          </span>
        ) : (
          <DynamicIcon
            name={workspace.icon}
            style={{
              width: iconSize,
              height: iconSize,
              color: workspace.iconColor ?? "currentColor",
            }}
          />
        );
    } else {
      glyph = initial;
    }
  }

  return (
    <>
      <Grid columns="36px 1fr" gap={4} style={{ width: "fit-content" }}>
        <GridRow style={{ width: "fit-content" }}>
          <GridCell>
            <Button
              ref={initialRef}
              data-has-icon={workspace?.icon !== null}
              className="name-initial workspace-avatar"
              onClick={() => setSwitcherOpen((v) => !v)}
              variant="ghost"
              style={{
                width: isMobile ? 18 : 32,
                height: isMobile ? 16 : 28,
                minWidth: isMobile ? 18 : 32,
                minHeight: isMobile ? 16 : 28,
                padding: 0,
                borderRadius: "var(--tt-radius-sm)",
                cursor: "pointer",
              }}
            >
              <span className="tiptap-button-icon workspace-icon-button">
                {glyph}
                {unreadCount > 0 && (
                  <span className="workspace-notification-badge" />
                )}
              </span>
            </Button>

            <WorkspaceSwitcherPopover
              anchorRef={initialRef}
              open={switcherOpen}
              onClose={() => setSwitcherOpen(false)}
            />
          </GridCell>

          {/* ── Middle: name over subtext ── */}
          <GridCell
            className="sidebar-ws-name-cell"
            style={{
              flexDirection: "column",
              alignItems: "flex-start",
              justifyContent: "center",
              gap: 1,
            }}
          >
            <span
              style={{
                color: "var(--tt-text-primary)",
                fontSize: 15,
                fontFamily:
                  'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI Variable Display", "Segoe UI", Helvetica, "Apple Color Emoji", "Noto Sans Arabic", "Noto Sans Hebrew", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"',
                fontWeight: 500,
                lineHeight: 1.15,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "100%",
              }}
            >
              {name}
            </span>
          </GridCell>
        </GridRow>
      </Grid>
    </>
  );
});
User.displayName = "User";

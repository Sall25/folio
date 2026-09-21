import { memo, useRef, useState } from "react";
import { useCurrentPerson } from "src/hooks/use-session";
import { useCurrentWorkspace } from "src/hooks/use-workspaces";
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
import { useIsMobile } from "src/hooks/use-breakpoint";

const UserSkeleton = memo(() => {
  return (
    <div className="sidebar-tree-skeleton__row">
      <Bone width={13} height={13} rounded />
      <Bone width={"62%"} height={10} pill />
    </div>
  );
});
UserSkeleton.displayName = "UserSkeleton";

export const User = memo(() => {
  const { person, isLoading } = useCurrentPerson();
  const isMobile = useIsMobile();

  const { workspace } = useCurrentWorkspace();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const initialRef = useRef<HTMLButtonElement>(null);

  const wsName = workspace?.name ?? person?.name ?? "";
  const wsIcon = workspace?.icon ?? null;
  const wsIconColor = workspace?.iconColor ?? null;
  const initial = wsName ? wsName.charAt(0).toUpperCase() : "?";

  const { unreadCount } = useNotificationState();

  if (isLoading) return <UserSkeleton />;

  return (
    <>
      <Grid columns="36px 1fr" gap={4} style={{ width: "fit-content" }}>
        <GridRow style={{ width: "fit-content" }}>
          <GridCell>
            <Button
              ref={initialRef}
              className="name-initial workspace-avatar"
              onClick={() => setSwitcherOpen((v) => !v)}
              variant="ghost"
              style={{
                width: isMobile ? 18 : 26,
                height: isMobile ? 16 : 24,
                minWidth: isMobile ? 18 : 26,
                minHeight: isMobile ? 16 : 24,
                padding: 0,
                borderRadius: "var(--tt-radius-sm)",
                cursor: "pointer",
              }}
            >
              <span className="tiptap-button-icon workspace-icon-button">
                {wsIcon ? (
                  <DynamicIcon
                    name={wsIcon}
                    style={{
                      width: isMobile ? 15 : 18,
                      height: isMobile ? 15 : 18,
                      color: wsIconColor ?? "currentColor",
                    }}
                  />
                ) : (
                  initial
                )}
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
              {wsName}
            </span>
          </GridCell>
        </GridRow>
      </Grid>
    </>
  );
});
User.displayName = "User";

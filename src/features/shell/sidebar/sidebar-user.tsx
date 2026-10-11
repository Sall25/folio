import { memo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { SbChevronDownIcon } from "src/components/tiptap-icons/sidebar-icons";
import { useCurrentPerson } from "src/hooks/use-session";
import { useCurrentWorkspace } from "src/hooks/use-workspaces";
import { useCurrentSpace } from "src/hooks/use-current-space";
import { usePeople } from "src/hooks/use-people";
import { useGroups } from "src/hooks/use-groups";
import { effectiveMemberCount, type Group, type Person } from "src/types";
import { Bone } from "../skeletons";
import { useNotificationState } from "src/features/inbox/notification/notification-context";
import { WorkspaceSwitcherPopover } from "../../workspace/workspace-switcher-popover";
import { DynamicIcon } from "src/features/pages/cover/dynamic-icon";
import { PageItemIcon } from "../../pages/page-item/page-item-icon";
import "./sidebar-user.scss";

const UserSkeleton = memo(() => {
  return (
    <div className="sb-ws sb-ws--skeleton">
      <Bone width={28} height={28} rounded />
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <Bone width={96} height={10} pill />
        <Bone width={60} height={8} pill />
      </div>
    </div>
  );
});
UserSkeleton.displayName = "UserSkeleton";

// The current space — your workspace, or the teamspace you're in — as one
// quiet button: a small tile, the name and a chevron (the member line shows
// as its tooltip). Clicking anywhere on
// it opens the space switcher. Inside a teamspace, a back arrow before it
// returns to the workspace.
export const User = memo(() => {
  const { t } = useTranslation();
  const { person, isLoading } = useCurrentPerson();
  const { workspace } = useCurrentWorkspace();
  const space = useCurrentSpace();
  const { data: people = [] } = usePeople();
  const { data: groups = [] } = useGroups();
  // The dot also covers your other workspaces, so it hints where to switch.
  const { unreadCount, elsewhereUnreadCount } = useNotificationState();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  if (isLoading) return <UserSkeleton />;

  const inTeamspace = space.kind === "teamspace";

  let name: string;
  let meta: string;
  let tile: React.ReactNode;
  let tileKind: "initial" | "glyph";

  if (inTeamspace) {
    name = space.page?.title || t("teamspaces.untitled");
    meta = [
      workspace?.name,
      space.teamspace
        ? t("workspace.memberCount", {
            count: effectiveMemberCount(space.teamspace, groups as Group[]),
          })
        : null,
    ]
      .filter(Boolean)
      .join(" · ");
    tileKind = space.page ? "glyph" : "initial";
    tile = space.page ? (
      <PageItemIcon
        cover={space.page.cover}
        styles={{ width: 14, height: 14, fontSize: 14 }}
      />
    ) : (
      name.charAt(0).toUpperCase()
    );
  } else {
    name = workspace?.name ?? person?.name ?? "";
    meta = t("workspace.memberCount", {
      count: (people as Person[]).length,
    });
    if (workspace?.icon) {
      tileKind = "glyph";
      tile =
        workspace.iconTarget === "Emoji" ? (
          <span className="sb-ws__emoji">{workspace.icon}</span>
        ) : (
          <DynamicIcon
            name={workspace.icon}
            style={{
              width: 14,
              height: 14,
              color: workspace.iconColor ?? "currentColor",
            }}
          />
        );
    } else {
      tileKind = "initial";
      tile = name ? name.charAt(0).toUpperCase() : "?";
    }
  }

  return (
    <div className="sb-ws-row">
      <button
        ref={buttonRef}
        type="button"
        className={`sb-ws${switcherOpen ? " is-open" : ""}`}
        aria-haspopup="menu"
        aria-expanded={switcherOpen}
        aria-label={t("workspace.switch", {
          name,
          defaultValue: "Switch space: {{name}}",
        })}
        title={meta || undefined}
        onClick={() => setSwitcherOpen((v) => !v)}
      >
        <span className={`sb-ws__tile sb-ws__tile--${tileKind}`}>
          {tile}
          {(unreadCount > 0 || elsewhereUnreadCount > 0) && (
            <span className="workspace-notification-badge" />
          )}
        </span>
        <span className="sb-ws__name">{name}</span>
        <SbChevronDownIcon size={13} className="sb-ws__chevron" />
      </button>

      <WorkspaceSwitcherPopover
        anchorRef={buttonRef}
        open={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
      />
    </div>
  );
});
User.displayName = "User";

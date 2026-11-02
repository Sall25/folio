import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-location";
import { useCurrentWorkspace, useMyWorkspaces } from "src/hooks/use-workspaces";
import {
  useCreateWorkspace,
  useSwitchWorkspace,
} from "src/hooks/use-workspace-switch";
import { useCurrentSpace } from "src/hooks/use-current-space";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "src/components/tiptap-ui-primitive/tooltip";
import { Plus } from "src/components/icons";
import { WorkspaceGlyph } from "src/features/workspace/workspace-switcher-popover";
import { SidebarDock } from "src/features/shell/sidebar/sidebar-dock";
import { useEditorLayoutState } from "src/features/shell/context/editor-layout-context";
import { useLayoutMode } from "src/features/shell/hooks/use-layout-mode";
import "./desktop-rail.scss";

// The rail (desktop app, main window): a narrow column at the window's left
// edge, part of the sidebar (same colour, a hairline between them). At the
// top your workspaces: the one you're in is a tile filled with the accent,
// the others quiet tiles, one click to switch, and + to create one. Below,
// Home · Inbox · Chats with their names, and your account at the foot. It
// replaces the sidebar's bottom dock. It sits inside the docked sidebar's
// width (the sidebar makes room for it, desktop-rail.scss), so the page's
// layout is unchanged; it goes away with the sidebar when that's collapsed,
// floating or on a narrow window, and the dock comes back there.

export function DesktopRail() {
  const { collapsed } = useEditorLayoutState();
  const { mode } = useLayoutMode();
  if (mode === "mobile" || collapsed) return null;
  return <Rail />;
}

function Rail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { workspace } = useCurrentWorkspace();
  const { workspaces } = useMyWorkspaces();
  const space = useCurrentSpace();
  const switchWorkspace = useSwitchWorkspace();
  const createWorkspace = useCreateWorkspace();
  const busy = switchWorkspace.isPending || createWorkspace.isPending;

  // Same as the switcher menu: another workspace switches (and goes to its
  // home); the current one while inside a teamspace goes back to it.
  const open = (id: string) => {
    if (busy) return;
    if (id === workspace?.id) {
      if (space.kind === "teamspace") navigate({ to: "/" });
      return;
    }
    switchWorkspace.mutate(id, { onSuccess: () => navigate({ to: "/" }) });
  };

  const create = () => {
    if (busy) return;
    createWorkspace.mutate(t("workspace.newDefaultName", "New workspace"), {
      onSuccess: () => navigate({ to: "/" }),
    });
  };

  return (
    <nav
      className="desktop-rail"
      aria-label={t("desktop.rail", "Workspaces and navigation")}
    >
      <div className="desktop-rail__workspaces">
        {workspaces.map((ws) => {
          const current = ws.id === workspace?.id;
          return (
            <Tooltip key={ws.id} delay={300} placement="right">
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={`desktop-rail__ws${current ? " is-current" : ""}`}
                  aria-label={ws.name}
                  aria-current={current ? "true" : undefined}
                  onClick={() => open(ws.id)}
                >
                  <WorkspaceGlyph ws={ws} size={18} />
                </button>
              </TooltipTrigger>
              <TooltipContent>{ws.name}</TooltipContent>
            </Tooltip>
          );
        })}
        <Tooltip delay={300} placement="right">
          <TooltipTrigger asChild>
            <button
              type="button"
              className="desktop-rail__add"
              aria-label={t("workspace.new", "New workspace")}
              onClick={create}
              disabled={busy}
            >
              <Plus size={18} />
            </button>
          </TooltipTrigger>
          <TooltipContent>{t("workspace.new", "New workspace")}</TooltipContent>
        </Tooltip>
      </div>
      <span className="desktop-rail__divider" aria-hidden />
      <SidebarDock vertical />
    </nav>
  );
}

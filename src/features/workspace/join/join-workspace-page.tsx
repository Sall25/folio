import { UploadedIcon } from "src/components/uploaded-icon/uploaded-icon";
import { useEffect } from "react";
import { useLocation, useNavigate } from "@tanstack/react-location";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Building2 } from "src/components/icons";
import {
  joinWorkspaceWithLink,
  previewWorkspaceInvite,
} from "src/api/workspace-members";
import { useSwitchWorkspace } from "src/hooks/use-workspace-switch";
import { useToast } from "src/features/shell/toast";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { DynamicIcon } from "src/features/pages/cover/dynamic-icon";
import "./join-workspace-page.scss";
import { takePendingInvite, tokenFromInvitePath } from "./pending-invite";

// /invite/<token>: who's inviting you and a Join button. Joining adds you
// as a member and switches you into the workspace. A link that's been
// turned off or replaced says so.
export function JoinWorkspacePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { show } = useToast();
  const token = tokenFromInvitePath(location.current.pathname) ?? "";
  const switchWorkspace = useSwitchWorkspace();

  // We're on the invite now — forget any copy saved while signed out, so
  // it doesn't bring you back here later.
  useEffect(() => {
    takePendingInvite();
  }, []);

  const preview = useQuery({
    queryKey: ["workspace-invite-preview", token],
    queryFn: () => previewWorkspaceInvite(token),
    enabled: !!token,
    staleTime: 0,
  });

  const join = useMutation({
    mutationFn: async () => {
      const ws = preview.data?.alreadyMember
        ? preview.data.workspaceId
        : await joinWorkspaceWithLink(token);
      await switchWorkspace.mutateAsync(ws);
    },
    onSuccess: () => {
      show(
        t("join.joined", { workspace: preview.data?.name ?? "" }),
        "success",
      );
      navigate({ to: "/" });
    },
    onError: (e) =>
      show(e instanceof Error ? e.message : t("join.failed"), "error"),
  });

  const ws = preview.data;

  return (
    <div className="join-ws">
      <div className="join-ws__card">
        {preview.isLoading ? (
          <div className="join-ws__loading" aria-label={t("join.loading")} />
        ) : !ws ? (
          <>
            <div className="join-ws__icon is-muted">
              <Building2 size={22} />
            </div>
            <h1 className="join-ws__title">{t("join.invalidTitle")}</h1>
            <p className="join-ws__text">{t("join.invalidText")}</p>
            <Button onClick={() => navigate({ to: "/" })}>
              <span className="tiptap-button-text">{t("join.goHome")}</span>
            </Button>
          </>
        ) : (
          <>
            <div className="join-ws__icon">
              {ws.icon ? (
                ws.iconTarget === "Emoji" ? (
                  <span style={{ fontSize: 26, lineHeight: 1 }}>{ws.icon}</span>
                ) : ws.iconTarget === "Upload" ? (
                  <UploadedIcon src={ws.icon} size={26} />
                ) : (
                  <DynamicIcon
                    name={ws.icon}
                    style={{
                      width: 26,
                      height: 26,
                      color: ws.iconColor ?? "currentColor",
                    }}
                  />
                )
              ) : (
                (ws.name || "?").charAt(0).toUpperCase()
              )}
            </div>
            <h1 className="join-ws__title">
              {ws.alreadyMember
                ? t("join.alreadyTitle", { workspace: ws.name })
                : t("join.title", { workspace: ws.name })}
            </h1>
            <p className="join-ws__text">
              {t("join.memberCount", { count: ws.memberCount })}
            </p>
            <div className="join-ws__actions">
              <Button disabled={join.isPending} onClick={() => join.mutate()}>
                <span className="tiptap-button-text">
                  {join.isPending
                    ? t("join.joining")
                    : ws.alreadyMember
                      ? t("join.open", { workspace: ws.name })
                      : t("join.join")}
                </span>
              </Button>
              {!ws.alreadyMember && (
                <Button variant="ghost" onClick={() => navigate({ to: "/" })}>
                  <span className="tiptap-button-text">{t("join.notNow")}</span>
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

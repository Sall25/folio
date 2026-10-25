import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-location";
import { Building2 } from "src/components/icons";
import {
  useAcceptWorkspaceInvite,
  useDeclineWorkspaceInvite,
  useMyWorkspaceInvites,
} from "src/hooks/use-workspace-members";
import { useToast } from "src/features/shell/toast";
import { Button } from "src/components/tiptap-ui-primitive/button";

// Invitations to other people's workspaces, at the top of the inbox.
// Accepting joins the workspace and switches into it.
export function WorkspaceInvites({ onDone }: { onDone?: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { show } = useToast();
  const { data: invites = [] } = useMyWorkspaceInvites();
  const accept = useAcceptWorkspaceInvite();
  const decline = useDeclineWorkspaceInvite();

  if (invites.length === 0) return null;

  const busy = accept.isPending || decline.isPending;

  return (
    <div className="inbox-invites">
      {invites.map((inv) => (
        <div key={inv.id} className="inbox-invite">
          <span className="inbox-item__icon">
            <Building2 size={15} />
          </span>
          <span className="inbox-item__text">
            <span className="inbox-item__title">
              {t("inbox.invite.title", {
                workspace: inv.workspaceName ?? t("inbox.invite.aWorkspace"),
              })}
            </span>
            <span className="inbox-item__message">
              {t(`inbox.invite.from_${inv.role}`, {
                name: inv.inviterName ?? t("inbox.invite.someone"),
              })}
            </span>
            <span className="inbox-invite__actions">
              <Button
                disabled={busy}
                onClick={() =>
                  accept.mutate(inv.id, {
                    onSuccess: () => {
                      navigate({ to: "/" });
                      show(
                        t("inbox.invite.joined", {
                          workspace: inv.workspaceName ?? "",
                        }),
                        "success",
                      );
                      onDone?.();
                    },
                    onError: (e) =>
                      show(
                        e instanceof Error
                          ? e.message
                          : t("inbox.invite.failed"),
                        "error",
                      ),
                  })
                }
              >
                <span className="tiptap-button-text">
                  {t("inbox.invite.accept")}
                </span>
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => decline.mutate(inv.id)}
              >
                <span className="tiptap-button-text">
                  {t("inbox.invite.decline")}
                </span>
              </Button>
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

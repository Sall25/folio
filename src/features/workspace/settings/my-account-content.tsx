import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "src/components/tiptap-ui-primitive/input";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Avatar } from "src/components/tiptap-ui-primitive/avatar";
import {
  useCurrentPerson,
  queryKeys as sessionQueryKeys,
} from "src/hooks/use-session";
import { useCurrentWorkspace } from "src/hooks/use-workspaces";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "src/lib/queryKeys";
import { patchPerson } from "src/api/people";
import { deleteWorkspace } from "src/api/workspaces";
import { signOut } from "src/features/auth/sign-out";
import { uploadFile } from "src/api/uploads";
import { useFileUpload } from "src/components/tiptap-node/image-upload-node/use-file-upload";
import { ConfirmDialog } from "../../shell/confirm-dialog";
import { AvatarCropDialog } from "./avatar-crop-dialog";
import "./workspace-settings-content.scss";

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="ws-setting-row">
      <div className="ws-setting-row__text">
        <span className="ws-setting-row__label">{label}</span>
        {description && (
          <span className="ws-setting-row__desc">{description}</span>
        )}
      </div>
      <div className="ws-setting-row__control">{children}</div>
    </div>
  );
}

async function uploadFn(
  file: File,
  onProgress: (e: { progress: number }) => void,
  signal: AbortSignal,
): Promise<string> {
  return uploadFile(file, "avatar", { onProgress, signal });
}

// "Change photo" opens the cropper first; what's uploaded is the cropped
// square, not the original file.
function AvatarUploadButton({
  name,
  avatarUrl,
  disabled,
  onUploaded,
  onRemove,
}: {
  name: string;
  avatarUrl: string | null;
  disabled?: boolean;
  onUploaded: (url: string) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<File | null>(null);
  const { fileItems, uploadFiles } = useFileUpload({
    maxSize: 5 * 1024 * 1024,
    limit: 1,
    accept: "image/*",
    upload: uploadFn,
    onSuccess: onUploaded,
  });

  const uploading = fileItems.some((f) => f.status === "uploading");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // The same file can be picked again after Cancel.
    e.target.value = "";
    if (file) setPicked(file);
  };

  return (
    <div className="ws-avatar-upload">
      <Avatar size="lg" src={avatarUrl} name={name} />
      <label
        className={`ws-avatar-upload__btn${disabled ? " is-disabled" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          disabled={disabled || uploading}
          onChange={handleChange}
          onClick={(e) => e.stopPropagation()}
          style={{ display: "none" }}
        />
        {uploading
          ? t("settings.account.uploading", "Uploading…")
          : t("settings.account.changePhoto", "Change photo")}
      </label>
      {avatarUrl && !uploading && (
        <button
          type="button"
          className="ws-avatar-upload__remove"
          disabled={disabled}
          onClick={onRemove}
        >
          {t("settings.account.removePhoto", "Remove")}
        </button>
      )}
      <AvatarCropDialog
        file={picked}
        onCancel={() => setPicked(null)}
        onChooseAnother={() => inputRef.current?.click()}
        onSave={(cropped) => {
          setPicked(null);
          uploadFiles([cropped]);
        }}
      />
    </div>
  );
}

function DeleteWorkspaceRow({
  workspaceId,
  workspaceName,
}: {
  workspaceId: string;
  workspaceName: string;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setDeleting(true);
    setError(null);
    try {
      await deleteWorkspace(workspaceId);
      setDialogOpen(false);
      // The workspace this account belongs to no longer exists — this
      // account's own people row now has a dangling workspace_id (same
      // class of problem the earlier table-wipe saga hit). Signing out is
      // a stopgap, NOT a real resolution: there is currently no flow that
      // recreates or reassigns a workspace for this person afterward, so
      // they will hit AuthGate's isMissingPerson/error screen on next
      // sign-in. This needs a real decision before shipping.
      await signOut(queryClient);
    } catch (e) {
      setDeleting(false);
      setError(e instanceof Error ? e.message : "Failed to delete workspace");
      setDialogOpen(false);
    }
  };

  return (
    <>
      <SettingRow
        label={t("settings.account.deleteWorkspaceTitle", "Delete workspace")}
        description={t(
          "settings.account.deleteWorkspaceDesc",
          "Permanently delete this workspace and everything in it. This cannot be undone.",
        )}
      >
        <Button
          variant="ghost"
          onClick={() => setDialogOpen(true)}
          disabled={deleting}
          style={{ color: "var(--tt-color-red-dec-2, #e5484d)" }}
        >
          <span className="tiptap-button-text">
            {t("settings.account.deleteWorkspaceAction", "Delete workspace")}
          </span>
        </Button>
      </SettingRow>

      {error && <p className="ws-danger-confirm__error">{error}</p>}

      <ConfirmDialog
        open={dialogOpen}
        message={
          <>
            {t("settings.account.deleteWorkspaceConfirmPre", "Delete")}{" "}
            <strong>{workspaceName}</strong>
            {t(
              "settings.account.deleteWorkspaceConfirmPost",
              "? This will permanently delete the workspace and everything in it. This cannot be undone.",
            )}
          </>
        }
        confirmLabel={
          deleting
            ? t("settings.account.deleting", "Deleting…")
            : t("settings.account.deleteWorkspaceAction", "Delete workspace")
        }
        cancelLabel={t("actions.cancel", "Cancel")}
        destructive
        onCancel={() => !deleting && setDialogOpen(false)}
        onConfirm={handleConfirm}
      />
    </>
  );
}

export function MyAccountContent() {
  const { t } = useTranslation();
  const { person } = useCurrentPerson();
  const { workspace } = useCurrentWorkspace();
  const queryClient = useQueryClient();

  const [nameDraft, setNameDraft] = useState<string | null>(null);

  if (!person) {
    return (
      <div className="ws-settings-content__empty">
        {t("settings.account.loading", "Loading account…")}
      </div>
    );
  }

  const isOwner = person.role === "owner";

  const invalidatePerson = () => {
    queryClient.invalidateQueries({ queryKey: sessionQueryKeys.currentPerson });
    queryClient.invalidateQueries({
      queryKey: queryKeys.people.lists(person.workspaceId),
    });
  };

  const commitName = () => {
    const next = (nameDraft ?? person.name).trim();
    setNameDraft(null);
    if (next && next !== person.name) {
      patchPerson(person.id, { name: next }).then(invalidatePerson);
    }
  };

  const handleAvatarUploaded = (url: string) => {
    patchPerson(person.id, { avatarUrl: url }).then(invalidatePerson);
  };

  return (
    <div className="ws-settings-content">
      <SettingRow
        label={t("settings.account.avatar", "Photo")}
        description={t(
          "settings.account.avatarDesc",
          "Shown next to your name across the workspace.",
        )}
      >
        <AvatarUploadButton
          name={person.name}
          avatarUrl={person.avatarUrl}
          onUploaded={handleAvatarUploaded}
          onRemove={() =>
            patchPerson(person.id, { avatarUrl: null }).then(invalidatePerson)
          }
        />
      </SettingRow>

      <SettingRow
        label={t("settings.account.name", "Preferred name")}
        description={t(
          "settings.account.nameDesc",
          "How your name appears to others.",
        )}
      >
        <Input
          value={nameDraft ?? person.name}
          onChange={(e) => setNameDraft(e.currentTarget.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
      </SettingRow>

      <SettingRow
        label={t("settings.account.email", "Email")}
        description={t(
          "settings.account.emailDesc",
          "Used to sign in. Contact support to change it.",
        )}
      >
        <span className="ws-setting-row__static">{person.email}</span>
      </SettingRow>

      <Separator orientation="horizontal" />

      <div className="ws-settings-content__danger">
        <SettingRow
          label={t("settings.account.deleteTitle", "Delete account")}
          description={t(
            "settings.account.deleteDesc",
            "Permanently delete your account and all your data. This cannot be undone.",
          )}
        >
          <Button
            variant="ghost"
            disabled
            title={t("workspace.comingSoon", "Coming soon")}
            style={{ color: "var(--tt-color-red-dec-2, #e5484d)" }}
          >
            <span className="tiptap-button-text">
              {t("settings.account.deleteAction", "Delete account")}
            </span>
          </Button>
        </SettingRow>

        {isOwner && workspace && (
          <DeleteWorkspaceRow
            workspaceId={workspace.id}
            workspaceName={workspace.name}
          />
        )}
      </div>
    </div>
  );
}

import { useTranslation } from "react-i18next";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { DownloadForOffline, OfflinePin } from "src/components/icons";
import {
  canSaveMedia,
  removeMedia,
  saveMedia,
  useMediaSaveState,
} from "src/lib/media-cache";
import { formatBytes } from "src/lib/offline-storage";
import "./media-save-button.scss";

// "Save to this computer" on a media block (desktop app only): downloads the
// file so it shows or plays offline (media-cache.ts). While it downloads the
// button shows how far it got; once saved it shows a pin, and clicking it
// again removes the copy. Renders nothing on the web, and for links to video
// sites.

export function MediaSaveButton({
  url,
  className,
}: {
  url: string | null | undefined;
  className?: string;
}) {
  const { t, i18n } = useTranslation();
  const state = useMediaSaveState(url);
  if (!canSaveMedia(url)) return null;

  const tooltip =
    state.kind === "saved"
      ? t("mediaSave.saved", {
          size: formatBytes(state.size, i18n.language),
        })
      : state.kind === "saving"
        ? t("mediaSave.saving")
        : t("mediaSave.save");

  return (
    <Button
      type="button"
      variant="ghost"
      className={`media-save-btn${className ? ` ${className}` : ""}`}
      tooltip={tooltip}
      showTooltip
      aria-label={tooltip}
      data-active-state={state.kind === "saved" ? "on" : "off"}
      disabled={state.kind === "saving"}
      onClick={(e) => {
        e.stopPropagation();
        if (state.kind === "saved") void removeMedia(url);
        else void saveMedia(url);
      }}
    >
      {state.kind === "saving" ? (
        <span className="media-save-btn__pct">
          {state.progress === null
            ? "…"
            : `${Math.round(state.progress * 100)}%`}
        </span>
      ) : state.kind === "saved" ? (
        <OfflinePin className="tiptap-button-icon media-save-btn__pin" />
      ) : (
        <DownloadForOffline className="tiptap-button-icon" />
      )}
    </Button>
  );
}

import { CloudOff, RefreshCw } from "src/components/icons";
import { useTranslation } from "react-i18next";
import { Button } from "src/components/tiptap-ui-primitive/button";
import "./unavailable-offline.scss";

// Shown instead of the editor when the page can't be opened:
//   • offline, and this page has no copy on this device (it was never opened
//     here, and isn't marked "Available offline");
//   • stalled: online, but the server hasn't sent the page (it may be waking
//     up, or it refused the connection) and there's no local copy — with a
//     button to try again.
// Without it the page would show its loading skeleton forever. Either goes
// away by itself once the page loads.
export function UnavailableOffline({
  stalled = false,
  onRetry,
}: {
  stalled?: boolean;
  onRetry?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="unavailable-offline" role="status">
      <CloudOff size={28} aria-hidden />
      <p className="unavailable-offline__title">
        {stalled ? t("offline.stalled.title") : t("offline.unavailable.title")}
      </p>
      <p className="unavailable-offline__body">
        {stalled ? t("offline.stalled.body") : t("offline.unavailable.body")}
      </p>
      {stalled && onRetry && (
        <Button
          variant="ghost"
          className="unavailable-offline__retry"
          onClick={onRetry}
        >
          <RefreshCw className="tiptap-button-icon" size={14} />
          <span className="tiptap-button-text">
            {t("offline.stalled.retry")}
          </span>
        </Button>
      )}
    </div>
  );
}

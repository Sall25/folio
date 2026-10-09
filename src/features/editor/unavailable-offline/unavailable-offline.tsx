import { CloudOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import "./unavailable-offline.scss";

// Shown instead of the editor when you're offline and this page has no copy
// on this device (it was never opened here, and isn't marked "Available
// offline"). Without it the page would show its loading skeleton forever.
// It goes away by itself once the connection is back and the page loads.
export function UnavailableOffline() {
  const { t } = useTranslation();
  return (
    <div className="unavailable-offline" role="status">
      <CloudOff size={28} aria-hidden />
      <p className="unavailable-offline__title">
        {t("offline.unavailable.title")}
      </p>
      <p className="unavailable-offline__body">
        {t("offline.unavailable.body")}
      </p>
    </div>
  );
}

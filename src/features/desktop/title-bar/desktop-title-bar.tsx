import { getCurrentWindow } from "@tauri-apps/api/window";
import { useTranslation } from "react-i18next";
import { isDesktopApp, isMac } from "../platform";
import "./desktop-title-bar.scss";

// The desktop app's own title bar (the window has no system one): it drags
// the window (double click maximizes), holds the page tabs once someone is
// signed in (DesktopTabs, rendered into the slot), and the window buttons
// on Windows and Linux. On macOS the system's traffic lights stay, over its
// left end (src-tauri/tauri.macos.conf.json). Mounted once, from App.tsx;
// nothing on the web.

export const TITLE_BAR_SLOT_ID = "desktop-title-bar-slot";

export function DesktopTitleBar() {
  if (!isDesktopApp) return null;
  return (
    <div className="desktop-title-bar" data-tauri-drag-region>
      {isMac && (
        <div className="desktop-title-bar__traffic" data-tauri-drag-region />
      )}
      <div
        id={TITLE_BAR_SLOT_ID}
        className="desktop-title-bar__slot"
        data-tauri-drag-region
      />
      {!isMac && <WindowButtons />}
    </div>
  );
}

function WindowButtons() {
  const { t } = useTranslation();
  const win = getCurrentWindow();
  return (
    <div className="desktop-title-bar__window">
      <button
        type="button"
        aria-label={t("desktop.minimize")}
        title={t("desktop.minimize")}
        onClick={() => void win.minimize()}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <path d="M0 5h10" stroke="currentColor" strokeWidth="1" />
        </svg>
      </button>
      <button
        type="button"
        aria-label={t("desktop.maximize")}
        title={t("desktop.maximize")}
        onClick={() => void win.toggleMaximize()}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          aria-hidden="true"
        >
          <rect
            x="0.5"
            y="0.5"
            width="9"
            height="9"
            stroke="currentColor"
            strokeWidth="1"
          />
        </svg>
      </button>
      <button
        type="button"
        className="desktop-title-bar__close"
        aria-label={t("desktop.close")}
        title={t("desktop.close")}
        onClick={() => void win.close()}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <path
            d="M0.5 0.5l9 9M9.5 0.5l-9 9"
            stroke="currentColor"
            strokeWidth="1"
          />
        </svg>
      </button>
    </div>
  );
}

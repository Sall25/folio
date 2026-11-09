import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "src/features/shell/toast";

// Desktop app: checks GitHub for a newer release (tauri-plugin-updater reads
// latest.json from the latest release, see tauri.conf.json) at launch and
// every few hours. When there is one, a toast offers it; "Install and
// restart" downloads it, checks its signature, installs it and relaunches.
// It never installs on its own: restarting while someone types would lose
// their place. The toast comes back every 30 minutes until they install.
// Renders nothing.
const CHECK_MS = 4 * 60 * 60 * 1000;
const REMIND_MS = 30 * 60 * 1000;

type Update = Awaited<
  ReturnType<typeof import("@tauri-apps/plugin-updater").check>
>;

export function DesktopUpdater() {
  const { t } = useTranslation();
  const { show } = useToast();
  const found = useRef(false);
  const installing = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let remind: number | undefined;

    const install = async (update: NonNullable<Update>) => {
      if (installing.current) return;
      installing.current = true;
      show(
        t("desktopUpdate.downloading", "Downloading the update…"),
        "info",
      );
      try {
        await update.downloadAndInstall();
        // Windows closes the app to run the installer; elsewhere, relaunch.
        const { relaunch } = await import("@tauri-apps/plugin-process");
        await relaunch();
      } catch (err) {
        installing.current = false;
        console.warn("[updater] install failed", err);
        show(
          t(
            "desktopUpdate.failed",
            "The update couldn't be installed. Check your connection and try again.",
          ),
          "error",
        );
      }
    };

    const checkForUpdate = async () => {
      if (found.current || !navigator.onLine) return;
      try {
        const { check } = await import("@tauri-apps/plugin-updater");
        const update = await check();
        if (!update || cancelled) return;
        found.current = true;
        const offer = () =>
          show(
            t("desktopUpdate.available", {
              version: update.version,
              defaultValue: "Folio {{version}} is available.",
            }),
            "info",
            {
              label: t("desktopUpdate.install", "Install and restart"),
              onClick: () => void install(update),
            },
          );
        offer();
        remind = window.setInterval(offer, REMIND_MS);
      } catch (err) {
        // No connection, GitHub unreachable, or no release with an update
        // file yet: try again at the next check.
        console.warn("[updater] check failed", err);
      }
    };

    void checkForUpdate();
    const id = window.setInterval(() => void checkForUpdate(), CHECK_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      if (remind) window.clearInterval(remind);
    };
  }, [show, t]);

  return null;
}

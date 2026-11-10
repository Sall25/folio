import { useEffect, useRef } from "react";
import { useSession } from "src/hooks/use-session";
import { backupDue, readBackupSettings } from "src/lib/desktop-backup";
import { useRunBackup } from "./use-run-backup";

// Desktop app: the workspace backup (src/lib/desktop-backup.ts).

const CHECK_MS = 10 * 60 * 1000;
const FIRST_CHECK_MS = 60 * 1000;

/** Runs the backup when it's due: a minute after start, then every ten
 *  minutes checks whether the chosen interval has passed. Renders nothing. */
export function DesktopBackup() {
  const { session } = useSession();
  const personId = session?.user?.id ?? null;
  const run = useRunBackup();
  const runRef = useRef(run);
  useEffect(() => {
    runRef.current = run;
  }, [run]);

  useEffect(() => {
    if (!personId) return;
    const check = () => {
      if (!backupDue(readBackupSettings(personId))) return;
      runRef.current().catch((error) =>
        console.warn("[backup] failed", error),
      );
    };
    const first = window.setTimeout(check, FIRST_CHECK_MS);
    const id = window.setInterval(check, CHECK_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [personId]);

  return null;
}

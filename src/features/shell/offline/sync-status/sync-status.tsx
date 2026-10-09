import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { useMutationState, useQueryClient } from "@tanstack/react-query";
import { CloudCheck, CloudOff, CloudUpload, LoaderCircle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Card, CardBody } from "src/components/tiptap-ui-primitive/card";
import { useOnlineStatus } from "src/hooks/use-online-status";
import { useSession } from "src/hooks/use-session";
import { usePagesBase } from "src/hooks/use-pages";
import {
  listDirtyPageIds,
  subscribeDirtyDocs,
} from "src/lib/offline-doc-cache";
import {
  checkReachable,
  getSyncSnapshot,
  isNetworkError,
  markReachable,
  requestSyncNow,
  subscribeSyncStatus,
} from "src/lib/sync-status";
import { useOutboxCount } from "src/lib/chat-outbox";
import "./sync-status.scss";

// One status for "are my changes on the server?", shown in the toolbar on
// every view (desktop, tablet and, as an icon, mobile):
//
//   Offline · 2 waiting   no connection, or Folio's servers don't answer
//   Saving…               edits on their way (only after SAVING_DELAY_MS,
//                         so typing doesn't make it flicker)
//   3 changes waiting…    online, but not everything is sent yet
//   All changes saved     for SAVED_MS after a "Saving…", then nothing
//
// "Changes waiting" = pages with unsent edits on this device (the dirty
// flags from offline-doc-cache) + saves React Query has queued while offline
// (paused mutations) + chat messages written offline (chat-outbox.ts).
// Clicking the pill lists them.

const SAVING_DELAY_MS = 600;
const SAVED_MS = 2500;
const MAX_LISTED_PAGES = 8;

type Phase = "idle" | "saving" | "saved";

// This person's pages with unsent edits, kept up to date.
function useDirtyPageIds(personId: string | null): string[] {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    if (!personId) return;
    let cancelled = false;
    const read = () => {
      void listDirtyPageIds(personId).then((next) => {
        if (!cancelled) setIds(next);
      });
    };
    read();
    const unsubscribe = subscribeDirtyDocs(read);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [personId]);
  return personId ? ids : [];
}

// A request that never reached the server starts a reachability check; one
// that succeeded proves the server is there.
function useWatchRequests() {
  const qc = useQueryClient();
  useEffect(() => {
    const onEvent = (event: {
      type: string;
      action?: { type: string; error?: unknown };
    }) => {
      if (event.type !== "updated" || !event.action) return;
      const { type, error } = event.action;
      if ((type === "error" || type === "failed") && isNetworkError(error)) {
        checkReachable();
      } else if (type === "success") {
        markReachable();
      }
    };
    const stopQueries = qc.getQueryCache().subscribe(onEvent);
    const stopMutations = qc.getMutationCache().subscribe(onEvent);
    return () => {
      stopQueries();
      stopMutations();
    };
  }, [qc]);
}

function WaitingList({
  dirtyPageIds,
  pausedCount,
  messageCount,
  showTryNow,
}: {
  dirtyPageIds: string[];
  pausedCount: number;
  messageCount: number;
  showTryNow: boolean;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: titles } = usePagesBase(
    (pages) => new Map(pages.map((p) => [p.id, p.title])),
  );
  const listed = dirtyPageIds.slice(0, MAX_LISTED_PAGES);
  const more = dirtyPageIds.length - listed.length;

  return (
    <>
      {listed.length > 0 && (
        <div className="sync-status__section">
          <span className="sync-status__section-title">
            {t("offline.status.pagesTitle")}
          </span>
          <ul className="sync-status__pages">
            {listed.map((id) => (
              <li key={id}>
                {titles?.get(id) || t("page.untitled", "Untitled")}
              </li>
            ))}
            {more > 0 && (
              <li className="sync-status__more">
                {t("offline.status.morePages", { count: more })}
              </li>
            )}
          </ul>
        </div>
      )}
      {messageCount > 0 && (
        <p className="sync-status__text">
          {t("offline.status.chatMessages", { count: messageCount })}
        </p>
      )}
      {pausedCount > 0 && (
        <p className="sync-status__text">
          {t("offline.status.otherChanges", { count: pausedCount })}
        </p>
      )}
      {showTryNow && (
        <Button
          type="button"
          variant="ghost"
          className="sync-status__try"
          onClick={() => {
            checkReachable();
            requestSyncNow();
            void qc.resumePausedMutations();
          }}
        >
          {t("offline.status.tryNow")}
        </Button>
      )}
    </>
  );
}

export function SyncStatus({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const online = useOnlineStatus();
  const { session } = useSession();
  const personId = session?.user?.id ?? null;
  const { unreachable, sending } = useSyncExternalStore(
    subscribeSyncStatus,
    getSyncSnapshot,
    getSyncSnapshot,
  );
  const pending = useMutationState({
    filters: { status: "pending" },
    select: (m) => m.state.isPaused,
  });
  const pausedCount = pending.filter(Boolean).length;
  const inFlightCount = pending.length - pausedCount;
  const dirtyPageIds = useDirtyPageIds(personId);
  const messageCount = useOutboxCount(personId);
  useWatchRequests();

  const offline = !online || unreachable;
  const waitingCount = dirtyPageIds.length + pausedCount + messageCount;
  const busy = !offline && (sending || inFlightCount > 0);

  // "Saving…" only once it's been busy for a moment; "All changes saved"
  // briefly after it.
  const [phase, setPhase] = useState<Phase>("idle");
  useEffect(() => {
    const id = busy
      ? window.setTimeout(() => setPhase("saving"), SAVING_DELAY_MS)
      : window.setTimeout(
          () => setPhase((p) => (p === "saving" ? "saved" : p)),
          0,
        );
    return () => window.clearTimeout(id);
  }, [busy]);
  useEffect(() => {
    if (phase !== "saved") return;
    const id = window.setTimeout(() => setPhase("idle"), SAVED_MS);
    return () => window.clearTimeout(id);
  }, [phase]);

  const [open, setOpen] = useState(false);

  let Icon = CloudOff;
  let label: string;
  let hint: string | null = null;
  if (offline) {
    const base = online
      ? t("offline.status.unreachable")
      : t("offline.status.offline");
    label =
      waitingCount > 0
        ? `${base} · ${t("offline.status.waitingShort", { count: waitingCount })}`
        : base;
    hint = online
      ? t("offline.status.unreachableHint")
      : t("offline.status.offlineHint");
  } else if (busy && phase === "saving") {
    Icon = LoaderCircle;
    label = t("offline.status.saving");
  } else if (waitingCount > 0) {
    Icon = CloudUpload;
    label = t("offline.status.waiting", { count: waitingCount });
  } else if (phase === "saved") {
    Icon = CloudCheck;
    label = t("offline.status.saved");
  } else {
    return null;
  }

  const spinning = Icon === LoaderCircle;
  const pill = (
    <>
      <Icon
        size={14}
        className={spinning ? "sync-status__spin" : undefined}
        aria-hidden
      />
      {!compact && <span>{label}</span>}
    </>
  );

  // Saving / saved: nothing to show beyond the words.
  if (!offline && waitingCount === 0) {
    return (
      <span
        role="status"
        className="sync-status"
        title={compact ? label : undefined}
        aria-label={compact ? label : undefined}
      >
        {pill}
      </span>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="status"
          className="sync-status sync-status--button"
          title={compact ? label : undefined}
          aria-label={compact ? label : undefined}
        >
          {pill}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6}>
        <Card className="sync-status__card">
          <CardBody>
            <span className="sync-status__title">{label}</span>
            {hint && <p className="sync-status__text">{hint}</p>}
            <WaitingList
              dirtyPageIds={dirtyPageIds}
              pausedCount={pausedCount}
              messageCount={messageCount}
              showTryNow={online}
            />
          </CardBody>
        </Card>
      </PopoverContent>
    </Popover>
  );
}

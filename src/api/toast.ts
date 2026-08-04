import { QueryClient, MutationCache } from "@tanstack/react-query";

// Distinguish a network/connectivity failure from a real server error, so the
// toast can say "check your connection" vs. a generic failure.
function isNetworkError(error: unknown): boolean {
  const msg = String((error as Error)?.message ?? error).toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("timed out") ||
    msg.includes("timeout") ||
    msg.includes("connection") ||
    msg.includes("upstream connect") ||
    msg.includes("err_") || // ERR_CONNECTION_RESET, ERR_TIMED_OUT, etc.
    msg.includes("abort")
  );
}

// Build the QueryClient with a global mutation-error handler. Pass a `notify`
// function (the toast's show) — App wires it after the ToastProvider mounts.
// Because the QueryClient is created once outside React, we use a mutable
// holder the provider sets, rather than a hook.
type Notify = (message: string, kind?: "error" | "network") => void;

const notifyHolder: { current: Notify | null } = { current: null };

export function setMutationNotifier(fn: Notify) {
  notifyHolder.current = fn;
}

export function createQueryClient() {
  return new QueryClient({
    mutationCache: new MutationCache({
      onError: (error, _vars, _ctx, mutation) => {
        // Let a mutation opt out of the global toast (e.g. it handles its own).
        if (mutation.meta?.suppressErrorToast) return;

        const notify = notifyHolder.current;
        if (!notify) return;

        if (isNetworkError(error)) {
          notify(
            "Couldn't reach the server — check your connection. Your change wasn't saved.",
            "network",
          );
        } else {
          const custom = mutation.meta?.errorMessage as string | undefined;
          notify(custom ?? "Something went wrong. Please try again.", "error");
        }
      },
    }),
  });
}

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "src/api/supabase-client";
import type { Person } from "src/types";
import {
  clearOfflineData,
  isSignOutIntended,
  wipeAndReloadHome,
} from "src/lib/query-persistence";
import { listDirtyPageIds } from "src/lib/offline-doc-cache";

export const queryKeys = {
  session: ["session"] as const,
  currentPerson: ["currentPerson"] as const,
};

interface PeopleRow {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  role: Person["role"];
  created_at: number;
  workspace_id: string;
  notification_settings: Person["notificationSettings"] | null;
}

function toPerson(row: PeopleRow): Person {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatar_url,
    role: row.role,
    createdAt: row.created_at,
    workspaceId: row.workspace_id,
    notificationSettings: row.notification_settings ?? undefined,
  };
}

/**
 * The session the SDK keeps in localStorage (`sb-<project>-auth-token`), read
 * directly. Used only when getSession() fails to refresh an expired access
 * token — i.e. offline. On a real auth failure (revoked refresh token) the
 * SDK has already removed it from storage, so this finds nothing and the
 * person is correctly signed out.
 */
function readStoredSession(): Session | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !/^sb-.+-auth-token$/.test(key)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as
        (Session & { currentSession?: Session }) | null;
      // Older SDK versions nested it under currentSession.
      const stored = parsed?.currentSession ?? parsed;
      if (stored?.user?.id && stored.refresh_token) return stored;
    }
  } catch {
    /* storage blocked or malformed */
  }
  return null;
}

/**
 * The Supabase auth session, held in ONE shared query-cache entry rather than
 * per-component state. Every caller reads the same resolved session, so
 * getSession() runs once for the app instead of once per consumer.
 *
 * Offline: getSession() can't refresh an access token older than an hour and
 * returns null with an error — which used to land on the sign-in screen. The
 * stored session is used instead, so a signed-in person can open the app
 * offline; the SDK refreshes it (TOKEN_REFRESHED below) once the network is
 * back, and everything keyed on the token reconnects.
 */
export function useSession() {
  const { data: session, isLoading: loading } = useQuery({
    queryKey: queryKeys.session,
    queryFn: async (): Promise<Session | null> => {
      const { data, error } = await supabase.auth.getSession();
      if (data.session) return data.session;
      return error ? readStoredSession() : null;
    },
    staleTime: Infinity,
    // Resolving the session reads local storage — it must run offline too
    // (React Query pauses "online" queries while offline).
    networkMode: "always",
  });

  return { session: session ?? null, loading };
}

/**
 * Keeps the session entry in sync with Supabase auth events. Call ONCE, at
 * the app root (AuthGate) — useSession runs in dozens of components, and a
 * listener in each made every sign-out clear the cache dozens of times.
 */
export function useAuthListener() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        // Signed out (here, in another tab, or the session was revoked):
        // drop the offline copies on this device. If you were signed in,
        // reload — re-rendering in place doesn't work, because emptying the
        // cache doesn't refresh the screens reading it.
        //
        // A sign-out you didn't ask for here (Log out on another device or
        // in another tab, a password change, a revoked session) keeps your
        // page edits that never reached the server: they wait, and the
        // sign-in screen asks you to sign in again to send them. Only this
        // tab's Log out — which already asked — drops them.
        if (event === "SIGNED_OUT") {
          const previous = queryClient.getQueryData<Session | null>(
            queryKeys.session,
          );
          const wasSignedIn = previous != null;
          const personId = previous?.user?.id ?? null;
          const email = previous?.user?.email ?? null;
          void (async () => {
            const keepOwnUnsent =
              !isSignOutIntended() &&
              personId !== null &&
              (await listDirtyPageIds(personId)).length > 0;
            const wipe = { personId, email, keepOwnUnsent };
            if (wasSignedIn) {
              void wipeAndReloadHome(() => queryClient.clear(), wipe);
            } else {
              clearOfflineData(() => queryClient.clear(), wipe);
            }
          })();
          return;
        }
        // INITIAL_SESSION repeats what the session query already read.
        if (event === "INITIAL_SESSION") return;
        queryClient.setQueryData(queryKeys.session, newSession);
        queryClient.invalidateQueries({ queryKey: queryKeys.currentPerson });
      },
    );
    return () => listener.subscription.unsubscribe();
  }, [queryClient]);
}

/**
 * The domain-level "who am I" — resolves the auth session to the real
 * `Person` record.
 *
 * A valid session with NO matching `people` row is a real, distinct state —
 * not an error to throw past. This can happen if the row was deleted/never
 * created (a table wipe, a failed signup trigger, manual DB cleanup). Using
 * maybeSingle() instead of single() avoids PostgREST's 406 in that case
 * (single() demands exactly one row; zero rows is treated as a request
 * failure) and lets the caller render an explicit "no profile found" state
 * instead of an uncaught query error.
 *
 * Offline, the person comes from the saved query cache (see
 * query-persistence); a paused fetch doesn't count as loading.
 */
export function useCurrentPerson() {
  const { session, loading: sessionLoading } = useSession();

  const query = useQuery({
    queryKey: queryKeys.currentPerson,
    queryFn: async (): Promise<Person | null> => {
      if (!session?.user) return null;
      const { data, error } = await supabase
        .from("people")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();
      if (error) throw error;
      return data ? toPerson(data as PeopleRow) : null;
    },
    enabled: !sessionLoading && !!session?.user,
  });

  const isMissingPerson =
    !sessionLoading &&
    !query.isLoading &&
    !!session?.user &&
    query.data === null &&
    !query.error;

  return {
    person: query.data ?? null,
    isLoading: sessionLoading || query.isLoading,
    isAuthenticated: !!session?.user,
    isMissingPerson,
    error: query.error,
  };
}

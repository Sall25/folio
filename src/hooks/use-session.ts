import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "src/api/supabase-client";
import type { Person } from "src/types";

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
 * The Supabase auth session, held in ONE shared query-cache entry rather than
 * per-component state. Every caller reads the same resolved session, so
 * getSession() runs once for the app instead of once per consumer.
 */
export function useSession() {
  const queryClient = useQueryClient();

  const { data: session, isLoading: loading } = useQuery({
    queryKey: queryKeys.session,
    queryFn: async (): Promise<Session | null> =>
      (await supabase.auth.getSession()).data.session,
    staleTime: Infinity,
  });

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        queryClient.setQueryData(queryKeys.session, newSession);
        queryClient.invalidateQueries({ queryKey: queryKeys.currentPerson });
      },
    );
    return () => listener.subscription.unsubscribe();
  }, [queryClient]);

  return { session: session ?? null, loading };
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

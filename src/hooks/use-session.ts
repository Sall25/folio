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
}

function toPerson(row: PeopleRow): Person {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatar_url,
    role: row.role,
    createdAt: row.created_at,
    workspaceId: "workspace_default",
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
        .single();
      if (error) throw error;
      return toPerson(data as PeopleRow);
    },
    enabled: !sessionLoading && !!session?.user,
  });

  return {
    person: query.data ?? null,
    isLoading: sessionLoading || query.isLoading,
    isAuthenticated: !!session?.user,
  };
}

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "src/api/supabase-client";
import type { Person } from "src/types";

export const queryKeys = {
  session: ["session"] as const,
  currentPerson: ["currentPerson"] as const,
};

// Supabase row shape (snake_case) — kept private to this file, mapped to the
// real domain `Person` type (camelCase) before anything else touches it.
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
  };
}

/**
 * Tracks the raw Supabase auth session (token, expiry, etc). Most UI code
 * should use `useCurrentPerson` below instead — this is the lower-level
 * primitive it's built on.
 */
export function useSession() {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        queryClient.invalidateQueries({ queryKey: queryKeys.currentPerson });
      },
    );

    return () => listener.subscription.unsubscribe();
  }, [queryClient]);

  return { session, loading };
}

/**
 * The domain-level "who am I" — resolves the auth session to the real
 * `Person` record. This is what replaces the hardcoded
 * `{ name: "Souleymane Sall", email: "" }` placeholder in
 * WorkspaceSettings, the sidebar account button, and (once wired) the
 * teamspace membership filter that was left as
 * "No current-user concept yet" in simple-editor-sidebar.tsx.
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

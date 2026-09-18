import { useCurrentPerson } from "src/hooks/use-session";
import { supabase } from "src/api/supabase-client";
import { SidebarFooter } from "./sidebar-footer";

export function SidebarFooterConnected() {
  const { person } = useCurrentPerson();

  if (!person) return null;

  return (
    <SidebarFooter
      name={person.name}
      subtitle={person.email}
      avatarUrl={person.avatarUrl}
      onLogOut={() => supabase.auth.signOut()}
    />
  );
}

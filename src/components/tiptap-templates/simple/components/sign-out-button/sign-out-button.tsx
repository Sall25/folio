import { LogOut } from "lucide-react";
import { supabase } from "src/api/supabase-client";
import { Button } from "src/components/tiptap-ui-primitive/button";

export function SignOutButton() {
  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Failed to sign out:", error);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="default"
      onClick={handleSignOut}
    >
      <LogOut size={18} aria-hidden="true" />
      <span className="tiptap-button-text">Sign out</span>
    </Button>
  );
}

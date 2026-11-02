import { createClient } from "@supabase/supabase-js";
import { isDesktopApp } from "src/lib/desktop";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in your .env file.",
  );
}

// The desktop app signs in with Google or an email link in the browser,
// which comes back to the app with a folio:// link carrying a one-time code
// (features/desktop/deep-links). That's the PKCE flow: the code is only
// worth something to the app that started the sign-in, which holds the
// matching secret. The web keeps the default flow.
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: { flowType: isDesktopApp ? "pkce" : "implicit" },
});

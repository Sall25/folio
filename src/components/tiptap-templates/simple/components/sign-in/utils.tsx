import { type ReactNode } from "react";
import type { Provider } from "@supabase/supabase-js";
import { GoogleIcon } from "src/components/tiptap-icons";

// One-line-per-provider — add/remove entries to change what shows up. Only
// providers actually enabled in the Supabase dashboard will work at runtime;
// this list doesn't reflect dashboard config, it just drives the UI.
export const PROVIDERS: { id: Provider; label: string; icon: ReactNode }[] = [
  { id: "google", label: "Continue with Google", icon: <GoogleIcon /> },
];

import type { ReactNode } from "react";
import { useCurrentPerson } from "src/hooks/use-session";
import { SignIn } from "../sign-in";
import "./auth-gate.scss";

/**
 * Wrap the app root with this. Renders a simple loading ring while the
 * session is resolving (fast — reads local storage, no network), SignIn
 * once we know there's no session, then children once there's a real
 * signed-in person. The sidebar/editor content have their own skeletons
 * for once the real app mounts, so this doesn't need to mimic the layout.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useCurrentPerson();

  if (isLoading) {
    return (
      <div className="auth-gate-loading">
        <div className="auth-gate-loading__ring" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <SignIn />;
  }

  return <>{children}</>;
}

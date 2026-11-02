import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-location";
import { setDeepLinkNavigator } from "./deep-links";

/** Opens folio:// page links in the app (deep-links.ts). Mounted once,
 *  inside the router, in the desktop app's main window. */
export function DesktopDeepLinkNavigator() {
  const navigate = useNavigate();
  useEffect(
    () =>
      setDeepLinkNavigator((path, search) => navigate({ to: path, search })),
    [navigate],
  );
  return null;
}

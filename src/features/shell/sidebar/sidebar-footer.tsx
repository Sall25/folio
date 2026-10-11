import { memo } from "react";
import { SidebarAccount } from "./sidebar-account";
import "./sidebar-footer.scss";

// Pinned under the page tree: your account (New page is in the top row).
export const SidebarFooter = memo(() => {
  return (
    <div className="sb-footer">
      <SidebarAccount />
    </div>
  );
});
SidebarFooter.displayName = "SidebarFooter";

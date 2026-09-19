import { memo } from "react";
import { CardFooter } from "src/components/tiptap-ui-primitive/card";
import "./sidebar-footer.scss";
import { Button } from "src/components/tiptap-ui-primitive/button";

interface SidebarFooterProps {
  name: string;
  subtitle?: string; // email, plan label, whatever the caller wants shown
  avatarUrl?: string | null;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function SidebarFooterImpl({ name, subtitle, avatarUrl }: SidebarFooterProps) {
  return (
    <CardFooter className="sidebar-footer-wrap">
      <div className="sidebar-footer-fog" aria-hidden />

      <Button
        size="large"
        variant="ghost"
        type="button"
        className="sidebar-footer"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="sidebar-footer__avatar-img" />
        ) : (
          <span className="tiptap-button-icon">{initials(name)}</span>
        )}

        <span className="sidebar-footer__info">
          <span className="tiptap-button-text">{name}</span>
          {subtitle && <span className="sidebar-footer__plan">{subtitle}</span>}
        </span>
      </Button>
    </CardFooter>
  );
}

export const SidebarFooter = memo(SidebarFooterImpl);

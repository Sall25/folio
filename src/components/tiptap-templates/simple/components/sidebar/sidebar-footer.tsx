import { memo } from "react";
import { CardFooter } from "src/components/tiptap-ui-primitive/card";
import "./sidebar-footer.scss";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Avatar } from "src/components/tiptap-ui-primitive/avatar";
import { useIsMobile } from "src/hooks/use-breakpoint";

interface SidebarFooterProps {
  name: string;
  subtitle?: string; // email, plan label, whatever the caller wants shown
  avatarUrl?: string | null;
}

function SidebarFooterImpl({ name, subtitle, avatarUrl }: SidebarFooterProps) {
  const isMobile = useIsMobile();
  return (
    <CardFooter className="sidebar-footer-wrap">
      <div className="sidebar-footer-fog" aria-hidden />

      <Button
        size="large"
        variant="ghost"
        type="button"
        className="sidebar-footer"
      >
        <Avatar size={isMobile ? "sm" : "md"} src={avatarUrl} name={name} />

        <span className="sidebar-footer__info">
          <span
            className="tiptap-button-text"
            style={{
              opacity: 1,
              display: "block",
              fontSize: isMobile ? 13 : 14,
            }}
          >
            {name}
          </span>
          {subtitle && (
            <span
              className="sidebar-footer__plan"
              style={{ opacity: 1, display: "block" }}
            >
              {subtitle}
            </span>
          )}
        </span>
      </Button>
    </CardFooter>
  );
}

export const SidebarFooter = memo(SidebarFooterImpl);

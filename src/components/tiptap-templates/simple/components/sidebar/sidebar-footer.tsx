import { memo, useState } from "react";
import { ChevronsUpDown, LogOut, Settings } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "src/components/tiptap-ui-primitive/popover";
import { Card, CardFooter } from "src/components/tiptap-ui-primitive/card";
import { MenuRow } from "src/components/tiptap-node/inline-database/components/menu-row";
import "./sidebar-footer.scss";
import { Button } from "src/components/tiptap-ui-primitive/button";

interface SidebarFooterProps {
  name: string;
  subtitle?: string; // email, plan label, whatever the caller wants shown
  avatarUrl?: string | null;
  onOpenSettings?: () => void;
  onLogOut?: () => void;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function SidebarFooterImpl({
  name,
  subtitle,
  avatarUrl,
  onOpenSettings,
  onLogOut,
}: SidebarFooterProps) {
  const [open, setOpen] = useState(false);

  return (
    <CardFooter className="sidebar-footer-wrap">
      <div className="sidebar-footer-fog" aria-hidden />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            size="large"
            variant="ghost"
            type="button"
            className="sidebar-footer"
            data-open={open}
          >
            <span className="tiptap-button-icon">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="sidebar-footer__avatar-img"
                />
              ) : (
                initials(name)
              )}
            </span>

            <span className="sidebar-footer__info">
              <span className="tiptap-button-text">{name}</span>
              {subtitle && (
                <span className="sidebar-footer__plan">{subtitle}</span>
              )}
            </span>

            <ChevronsUpDown
              className="sidebar-footer__chevron tiptap-button-icon-sub"
              size={14}
              aria-hidden
            />
          </Button>
        </PopoverTrigger>

        <PopoverContent align="start" side="top">
          <Card style={{ padding: "5px 6px", minWidth: 180 }}>
            {onOpenSettings && (
              <MenuRow
                label="Settings"
                Icon={Settings}
                onClick={() => {
                  setOpen(false);
                  onOpenSettings();
                }}
              />
            )}
            {onLogOut && (
              <MenuRow
                label="Log out"
                Icon={LogOut}
                onClick={() => {
                  setOpen(false);
                  onLogOut();
                }}
              />
            )}
          </Card>
        </PopoverContent>
      </Popover>
    </CardFooter>
  );
}

export const SidebarFooter = memo(SidebarFooterImpl);

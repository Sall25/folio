import { memo, useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Settings, UserCircle } from "src/components/icons";
import { Avatar } from "src/components/tiptap-ui-primitive/avatar";
import { Button, ButtonGroup } from "src/components/tiptap-ui-primitive/button";
import { Card, CardBody } from "src/components/tiptap-ui-primitive/card";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "src/components/tiptap-ui-primitive/dropdown-menu";
import { useCurrentPerson } from "src/hooks/use-session";
import { requestSignOut } from "src/features/auth/sign-out";
import { WorkspaceSettingsContext } from "../../workspace/context/workspace-settings-context";
import "./sidebar-account.scss";

// Your account: avatar, name, "Account & settings" — or, `compact`, just the
// avatar (the dock's last slot). Click → a menu above it: who you are, Edit
// profile (workspace settings on My account) and Log out.
//
// The menu is portalled into #root and raised above the sidebar (z-index
// 120 docked, up to 950 floating / on mobile); the dropdown's own z-index
// (50) would leave it hidden behind the sidebar.
const MENU_STYLE = { zIndex: 999 } as const;
export const SidebarAccount = memo(
  ({ compact = false }: { compact?: boolean }) => {
    const { t } = useTranslation();
    const { person } = useCurrentPerson();
    const settings = useContext(WorkspaceSettingsContext);
    const queryClient = useQueryClient();
    const [signingOut, setSigningOut] = useState(false);

    if (!person) return null;
    const avatarSrc = person.avatarUrl ?? undefined;

    // Shared sign-out (see features/auth/sign-out): falls back to a local
    // sign-out offline, and asks first if something hasn't synced yet.
    const logOut = async () => {
      if (signingOut) return;
      setSigningOut(true);
      try {
        await requestSignOut(queryClient);
      } catch (e) {
        console.error("sign-out failed:", e);
      } finally {
        setSigningOut(false);
      }
    };

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={`sb-account${compact ? " sb-account--compact" : ""}`}
            aria-label={t("account.menu", "Account")}
            title={compact ? person.name : undefined}
          >
            <Avatar size="sm" src={avatarSrc} name={person.name} />
            {!compact && (
              <span className="sb-account__text">
                <span className="sb-account__name">{person.name}</span>
                <span className="sb-account__meta">
                  {t("sidebar.accountSettings")}
                </span>
              </span>
            )}
            {!compact && (
              <Settings
                size={16}
                strokeWidth={1.8}
                className="sb-account__gear"
                aria-hidden
              />
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuPortal container={document.getElementById("root")}>
          <DropdownMenuContent
            side="top"
            align={compact ? "end" : "start"}
            sideOffset={6}
            collisionPadding={8}
            style={MENU_STYLE}
          >
            <Card className="sb-account-menu">
              <CardBody>
                <div className="sb-account-menu__identity">
                  <Avatar size="sm" src={avatarSrc} name={person.name} />
                  <span className="sb-account-menu__identity-text">
                    <span className="sb-account__name">{person.name}</span>
                    {person.email && (
                      <span className="sb-account__meta">{person.email}</span>
                    )}
                  </span>
                </div>
                <Separator orientation="horizontal" />
                <ButtonGroup>
                  <DropdownMenuItem asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => settings?.openTo("my-account")}
                    >
                      <UserCircle size={16} className="tiptap-button-icon" />
                      <span className="tiptap-button-text">
                        {t("account.editProfile", "Edit profile")}
                      </span>
                    </Button>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      className="sb-account-menu__danger"
                      disabled={signingOut}
                      onClick={() => void logOut()}
                    >
                      <LogOut size={16} className="tiptap-button-icon" />
                      <span className="tiptap-button-text">
                        {t("account.logOut", "Log out")}
                      </span>
                    </Button>
                  </DropdownMenuItem>
                </ButtonGroup>
              </CardBody>
            </Card>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>
    );
  },
);
SidebarAccount.displayName = "SidebarAccount";

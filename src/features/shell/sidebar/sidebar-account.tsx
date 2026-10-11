import { memo, useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Settings, UserCircle } from "lucide-react";
import { Avatar } from "src/components/tiptap-ui-primitive/avatar";
import { Button, ButtonGroup } from "src/components/tiptap-ui-primitive/button";
import { Card, CardBody } from "src/components/tiptap-ui-primitive/card";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "src/components/tiptap-ui-primitive/dropdown-menu";
import { useCurrentPerson } from "src/hooks/use-session";
import { requestSignOut } from "src/features/auth/sign-out";
import { WorkspaceSettingsContext } from "../../workspace/context/workspace-settings-context";
import "./sidebar-account.scss";

// Your account, at the bottom of the sidebar: avatar, name, "Account &
// settings". Click → a menu above it: who you are, Edit profile (workspace
// settings on My account) and Log out.
export const SidebarAccount = memo(() => {
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
          className="sb-account"
          aria-label={t("account.menu", "Account")}
        >
          <Avatar size="sm" src={avatarSrc} name={person.name} />
          <span className="sb-account__text">
            <span className="sb-account__name">{person.name}</span>
            <span className="sb-account__meta">
              {t("sidebar.accountSettings")}
            </span>
          </span>
          <Settings
            size={16}
            strokeWidth={1.8}
            className="sb-account__gear"
            aria-hidden
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" sideOffset={6} portal>
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
    </DropdownMenu>
  );
});
SidebarAccount.displayName = "SidebarAccount";

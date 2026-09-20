import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { UserIdentity, Provider } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "src/api/supabase-client";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { Separator } from "src/components/tiptap-ui-primitive/separator";
import { GoogleIcon } from "src/components/tiptap-icons";
import { Github, Mail } from "lucide-react";
import "./workspace-settings-content.scss";

const PROVIDERS: { id: Provider; label: string; icon: ReactNode }[] = [
  { id: "google", label: "Continue with Google", icon: <GoogleIcon /> },
];

const IDENTITIES_QUERY_KEY = ["userIdentities"] as const;

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="ws-setting-row">
      <div className="ws-setting-row__text">
        <span className="ws-setting-row__label">{label}</span>
        {description && (
          <span className="ws-setting-row__desc">{description}</span>
        )}
      </div>
      <div className="ws-setting-row__control">{children}</div>
    </div>
  );
}

function providerIcon(provider: string) {
  switch (provider) {
    case "google":
      return <GoogleIcon />;
    case "github":
      return <Github size={18} aria-hidden="true" />;
    default:
      return <Mail size={18} aria-hidden="true" />;
  }
}

function providerLabel(provider: string, t: (k: string, d: string) => string) {
  switch (provider) {
    case "google":
      return "Google";
    case "github":
      return "GitHub";
    case "email":
      return t("settings.connections.emailPassword", "Email & password");
    default:
      return provider;
  }
}

export function MyConnectionsContent() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: identities = [], isLoading } = useQuery({
    queryKey: IDENTITIES_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUserIdentities();
      if (error) throw error;
      return data.identities;
    },
  });

  const canUnlink = identities.length > 1;

  const handleConnect = async (provider: Provider) => {
    setPending(provider);
    setError(null);
    const { error } = await supabase.auth.linkIdentity({ provider });
    // On success this redirects away to the provider (same as sign-in OAuth)
    // — no further local state change needed. Only surface an error if the
    // redirect never happens (e.g. manual linking disabled in the dashboard).
    if (error) {
      setPending(null);
      setError(error.message);
    }
  };

  const handleDisconnect = async (identity: UserIdentity) => {
    setPending(identity.identity_id);
    setError(null);
    const { error } = await supabase.auth.unlinkIdentity(identity);
    setPending(null);
    if (error) {
      setError(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: IDENTITIES_QUERY_KEY });
  };

  const linkedProviderIds = new Set(identities.map((i) => i.provider));
  const connectableProviders = PROVIDERS.filter(
    (p) => !linkedProviderIds.has(p.id),
  );

  if (isLoading) {
    return (
      <div className="ws-settings-content__empty">
        {t("settings.connections.loading", "Loading connections…")}
      </div>
    );
  }

  return (
    <div className="ws-settings-content">
      <p className="ws-settings-content__intro">
        {t(
          "settings.connections.intro",
          "Manage the accounts you can use to sign in.",
        )}
      </p>

      {error && <p className="ws-danger-confirm__error">{error}</p>}

      {identities.map((identity) => (
        <SettingRow
          key={identity.identity_id}
          label={providerLabel(identity.provider, t)}
        >
          <div className="ws-connection-row">
            <span className="ws-connection-row__icon">
              {providerIcon(identity.provider)}
            </span>
            <span className="ws-connection-row__status">
              {t("settings.connections.connected", "Connected")}
            </span>
            {identity.provider !== "email" && (
              <Button
                variant="ghost"
                disabled={!canUnlink || pending === identity.identity_id}
                title={
                  !canUnlink
                    ? t(
                        "settings.connections.needOneMore",
                        "Connect another method before disconnecting this one.",
                      )
                    : undefined
                }
                onClick={() => handleDisconnect(identity)}
                style={{ color: "var(--tt-color-red-dec-2, #e5484d)" }}
              >
                <span className="tiptap-button-text">
                  {pending === identity.identity_id
                    ? t("settings.connections.disconnecting", "Disconnecting…")
                    : t("settings.connections.disconnect", "Disconnect")}
                </span>
              </Button>
            )}
          </div>
        </SettingRow>
      ))}

      {connectableProviders.length > 0 && (
        <>
          <Separator orientation="horizontal" />
          <p className="ws-settings-content__intro">
            {t("settings.connections.addMore", "Connect another account")}
          </p>
          {connectableProviders.map((p) => (
            <SettingRow key={p.id} label={p.label}>
              <Button
                variant="ghost"
                disabled={pending === p.id}
                onClick={() => handleConnect(p.id)}
              >
                <span className="tiptap-button-text">
                  {pending === p.id
                    ? t("settings.connections.connecting", "Connecting…")
                    : t("settings.connections.connect", "Connect")}
                </span>
              </Button>
            </SettingRow>
          ))}
        </>
      )}
    </div>
  );
}

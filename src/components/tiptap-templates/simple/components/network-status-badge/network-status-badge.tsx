import { useTranslation } from "react-i18next";
import { Wifi, WifiOff, AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "src/components/tiptap-ui-primitive/tooltip";
import { useNetworkStatus } from "src/hooks/use-network-status";
import "./network-status-badge.scss";

// A compact connectivity indicator for the toolbar. When online it's subtle
// (or hidden); when unstable/offline it surfaces so failed actions read as a
// network issue, not a bug.
export function NetworkStatusBadge({
  hideWhenOnline = true,
}: {
  hideWhenOnline?: boolean;
}) {
  const status = useNetworkStatus();
  const { t } = useTranslation();

  if (status === "online" && hideWhenOnline) return null;

  const config = {
    online: {
      icon: <Wifi size={14} />,
      label: t("network.online", "Connected"),
      className: "network-badge--online",
    },
    unstable: {
      icon: <AlertTriangle size={14} />,
      label: t(
        "network.unstable",
        "Connection unstable — changes may not save",
      ),
      className: "network-badge--unstable",
    },
    offline: {
      icon: <WifiOff size={14} />,
      label: t("network.offline", "Offline — changes won't save"),
      className: "network-badge--offline",
    },
  }[status];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`network-badge ${config.className}`}>
          {config.icon}
          {status !== "online" && (
            <span className="network-badge__label">
              {status === "offline"
                ? t("network.offlineShort", "Offline")
                : t("network.unstableShort", "Unstable")}
            </span>
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent>{config.label}</TooltipContent>
    </Tooltip>
  );
}

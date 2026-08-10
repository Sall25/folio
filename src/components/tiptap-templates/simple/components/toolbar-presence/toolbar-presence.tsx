import { useCollabProvider } from "../../context/collab-provider-context";
import { usePresence } from "../../hooks/use-presence";
import { PresenceStack } from "../presence-stack";

export function ToolbarPresence() {
  const provider = useCollabProvider();
  const present = usePresence(provider);
  return <PresenceStack users={present} max={2} />;
}

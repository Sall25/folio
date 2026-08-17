import { useCollabProvider } from "../../context/collab-provider-context";
import { usePresence } from "../../hooks/use-presence";
import { PresenceStack } from "../presence-stack";

function ToolbarPresenceImpl() {
  const provider = useCollabProvider();
  const present = usePresence(provider);
  return <PresenceStack users={present} max={2} />;
}

export const ToolbarPresence = ToolbarPresenceImpl;

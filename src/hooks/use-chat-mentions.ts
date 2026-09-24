import { useQuery } from "@tanstack/react-query";
import { fetchUnreadMentions } from "src/api/chat-mentions";
import { useCurrentPerson } from "./use-session";

// Keyed under ["chat", "unread", …] on purpose: everything that already
// invalidates unread counts (new realtime messages, marking a room read)
// refreshes this too, by prefix.
export function useUnreadMentions() {
  const { person } = useCurrentPerson();
  return useQuery({
    queryKey: ["chat", "unread", "mentions"],
    queryFn: fetchUnreadMentions,
    enabled: !!person,
    staleTime: 30_000,
  });
}

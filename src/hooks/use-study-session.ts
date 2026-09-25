import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "src/api/supabase-client";
import {
  fetchOpenSession,
  fetchSessionParticipants,
  joinStudySession,
  leaveStudySession,
  startStudySession,
  stopStudySession,
  type StudySession,
} from "src/api/chat-study";

const sessionKey = (roomId: string) => ["chat", "study", roomId] as const;
const participantsKey = (sessionId: string) =>
  ["chat", "study-people", sessionId] as const;

export const STUDY_PRESETS = [
  { focus: 25, rest: 5, rounds: 4 },
  { focus: 50, rest: 10, rounds: 3 },
  { focus: 90, rest: 15, rounds: 2 },
] as const;

const MIN = 60_000;

export function sessionTotalMs(s: StudySession): number {
  return (s.rounds * (s.focusMinutes + s.breakMinutes) - s.breakMinutes) * MIN;
}

export function isSessionOpen(s: StudySession | null, now: number): boolean {
  return !!s && s.endedAt == null && now < s.startedAt + sessionTotalMs(s);
}

export interface SessionState {
  phase: "focus" | "break" | "done";
  round: number;
  remainingMs: number;
  phaseMs: number;
}

// Where a session is at `now`. Pure: every client computes the same answer
// from the same start time and settings.
export function sessionStateAt(s: StudySession, now: number): SessionState {
  const focusMs = s.focusMinutes * MIN;
  const breakMs = s.breakMinutes * MIN;
  const cycle = focusMs + breakMs;
  const elapsed = now - s.startedAt;

  if (s.endedAt != null || elapsed >= sessionTotalMs(s) || elapsed < 0) {
    return { phase: "done", round: s.rounds, remainingMs: 0, phaseMs: 1 };
  }
  const round = Math.floor(elapsed / cycle) + 1;
  const inCycle = elapsed % cycle;
  return inCycle < focusMs
    ? {
        phase: "focus",
        round,
        remainingMs: focusMs - inCycle,
        phaseMs: focusMs,
      }
    : { phase: "break", round, remainingMs: cycle - inCycle, phaseMs: breakMs };
}

// A 1-second clock while `active` (0 until the first tick). Reads the time
// in timer callbacks, never during render.
export function useTicker(active: boolean): number {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!active) return;
    const raf = requestAnimationFrame(() => setNow(Date.now()));
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(id);
    };
  }, [active]);
  return now;
}

// The room's session + participants, live, with the four actions.
export function useStudySession(roomId: string) {
  const qc = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: sessionKey(roomId),
    queryFn: () => fetchOpenSession(roomId),
  });
  const session = sessionQuery.data ?? null;

  const participantsQuery = useQuery({
    queryKey: participantsKey(session?.id ?? ""),
    queryFn: () => fetchSessionParticipants(session!.id),
    enabled: !!session,
  });

  useEffect(() => {
    const refreshSession = () =>
      qc.invalidateQueries({ queryKey: sessionKey(roomId) });
    const refreshPeople = () =>
      qc.invalidateQueries({ queryKey: ["chat", "study-people"] });

    const channel = supabase
      .channel(`chat:study:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_study_sessions",
          filter: `room_id=eq.${roomId}`,
        },
        refreshSession,
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_study_participants",
          filter: `room_id=eq.${roomId}`,
        },
        refreshPeople,
      )
      // DELETE events can't be filtered; refreshing is cheap.
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "chat_study_participants" },
        refreshPeople,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, qc]);

  const refreshAll = useCallback(() => {
    qc.invalidateQueries({ queryKey: sessionKey(roomId) });
    qc.invalidateQueries({ queryKey: ["chat", "study-people"] });
  }, [qc, roomId]);

  const start = useMutation({
    mutationFn: (p: { focus: number; rest: number; rounds: number }) =>
      startStudySession({
        roomId,
        focusMinutes: p.focus,
        breakMinutes: p.rest,
        rounds: p.rounds,
      }),
    onSettled: refreshAll,
  });
  const stop = useMutation({
    mutationFn: (id: string) => stopStudySession(id),
    onSettled: refreshAll,
  });
  const join = useMutation({
    mutationFn: (id: string) => joinStudySession(id),
    onSettled: refreshAll,
  });
  const leave = useMutation({
    mutationFn: (id: string) => leaveStudySession(id),
    onSettled: refreshAll,
  });

  return {
    session,
    participants: participantsQuery.data ?? [],
    start,
    stop,
    join,
    leave,
  };
}

export type StudySessionApi = ReturnType<typeof useStudySession>;

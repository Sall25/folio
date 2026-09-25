import { supabase } from "./supabase-client";

export interface StudySession {
  id: string;
  roomId: string;
  startedBy: string | null;
  startedAt: number;
  focusMinutes: number;
  breakMinutes: number;
  rounds: number;
  endedAt: number | null;
}

interface SessionRow {
  id: string;
  room_id: string;
  started_by: string | null;
  started_at: number;
  focus_minutes: number;
  break_minutes: number;
  rounds: number;
  ended_at: number | null;
}

const toSession = (r: SessionRow): StudySession => ({
  id: r.id,
  roomId: r.room_id,
  startedBy: r.started_by,
  startedAt: Number(r.started_at),
  focusMinutes: r.focus_minutes,
  breakMinutes: r.break_minutes,
  rounds: r.rounds,
  endedAt: r.ended_at == null ? null : Number(r.ended_at),
});

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

// The room's open session, if any. It may have run its course without being
// stopped — the client decides that from the clock.
export async function fetchOpenSession(
  roomId: string,
): Promise<StudySession | null> {
  const { data, error } = await supabase
    .from("chat_study_sessions")
    .select("*")
    .eq("room_id", roomId)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  fail(error);
  return data ? toSession(data as SessionRow) : null;
}

export async function fetchSessionParticipants(
  sessionId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("chat_study_participants")
    .select("person_id")
    .eq("session_id", sessionId)
    .order("joined_at", { ascending: true });
  fail(error);
  return ((data ?? []) as { person_id: string }[]).map((r) => r.person_id);
}

export async function startStudySession(args: {
  roomId: string;
  focusMinutes: number;
  breakMinutes: number;
  rounds: number;
}): Promise<string> {
  const { data, error } = await supabase.rpc("start_study_session", {
    p_room: args.roomId,
    p_focus: args.focusMinutes,
    p_break: args.breakMinutes,
    p_rounds: args.rounds,
  });
  fail(error);
  return data as string;
}

export async function stopStudySession(sessionId: string): Promise<void> {
  const { error } = await supabase.rpc("stop_study_session", {
    p_session: sessionId,
  });
  fail(error);
}

export async function joinStudySession(sessionId: string): Promise<void> {
  const { error } = await supabase.rpc("join_study_session", {
    p_session: sessionId,
  });
  fail(error);
}

export async function leaveStudySession(sessionId: string): Promise<void> {
  const { error } = await supabase.rpc("leave_study_session", {
    p_session: sessionId,
  });
  fail(error);
}

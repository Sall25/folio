// The Pomodoro clock, without any UI: phases, how long each lasts, and the
// time left. The running state is stored on the node (Yjs syncs it), as
// "started at" + "time left when started", so everyone on the page sees the
// same clock without writing every second.

export type PomodoroPhase = "focus" | "short" | "long";
export type PomodoroLook = "ring" | "clock" | "line" | "flip" | "sheet";
export type PomodoroSize = "small" | "medium" | "full";

export interface PomodoroAttrs {
  look: PomodoroLook;
  color: string;
  size: PomodoroSize;
  /** Minutes. */
  focus: number;
  shortBreak: number;
  longBreak: number;
  /** Focus rounds before a long break. */
  rounds: number;
  sound: "bell" | "none";
  autoStart: boolean;
  phase: PomodoroPhase;
  /** Which focus round (1…rounds). */
  round: number;
  /** When the clock was started (ms since epoch), null while paused. */
  startedAt: number | null;
  /** Time left (ms) when it was started or paused. */
  remainingMs: number;
}

export const POMODORO_DEFAULTS: PomodoroAttrs = {
  look: "ring",
  color: "#e5484d",
  size: "medium",
  focus: 25,
  shortBreak: 5,
  longBreak: 15,
  rounds: 4,
  sound: "bell",
  autoStart: false,
  phase: "focus",
  round: 1,
  startedAt: null,
  remainingMs: 25 * 60_000,
};

export const phaseMinutes = (a: PomodoroAttrs, phase: PomodoroPhase) =>
  phase === "focus" ? a.focus : phase === "short" ? a.shortBreak : a.longBreak;

export const phaseMs = (a: PomodoroAttrs, phase: PomodoroPhase) =>
  Math.max(1, phaseMinutes(a, phase)) * 60_000;

/** Time left now. */
export function remainingAt(a: PomodoroAttrs, now: number): number {
  if (a.startedAt == null) return a.remainingMs;
  return Math.max(0, a.remainingMs - (now - a.startedAt));
}

/** The phase after this one: focus → break (a long one every `rounds`). */
export function nextPhase(
  a: PomodoroAttrs,
): Pick<PomodoroAttrs, "phase" | "round"> {
  if (a.phase === "focus") {
    return a.round >= a.rounds
      ? { phase: "long", round: a.round }
      : { phase: "short", round: a.round };
  }
  return { phase: "focus", round: a.phase === "long" ? 1 : a.round + 1 };
}

/** The attrs for moving on to the next phase. */
export function advance(a: PomodoroAttrs, now: number): Partial<PomodoroAttrs> {
  const next = nextPhase(a);
  const merged = { ...a, ...next };
  return {
    ...next,
    remainingMs: phaseMs(merged, next.phase),
    startedAt: a.autoStart ? now : null,
  };
}

/** "15:24" (or "1:02:03" past an hour). */
export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return `${h ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

/** Three soft notes, made on the spot (no sound file to load). */
export function playBell() {
  try {
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AudioCtx();
    [880, 660, 990].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = "sine";
      const t = ctx.currentTime + i * 0.28;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.62);
    });
    window.setTimeout(() => void ctx.close(), 1600);
  } catch {
    // no audio here: the timer still works
  }
}

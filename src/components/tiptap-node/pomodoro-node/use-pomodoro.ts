import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  advance,
  formatClock,
  phaseMs,
  playBell,
  remainingAt,
  type PomodoroAttrs,
  type PomodoroPhase,
} from "./pomodoro-timing";

// A Pomodoro's running clock and its actions, shared by the block itself
// (pomodoro-view.tsx) and its copies in the pins pane and live views
// (pomodoro-card.tsx → PomodoroMirror).

const TICK_MS = 250;

/** What happens here when the phase runs out:
 *  - "advance": ring, and move on to the next phase (the block itself);
 *  - "bell": ring only (a copy of a block on another page: it can't write
 *    there; the page moves on when it's next open);
 *  - "none": nothing (a copy shown next to the block, which does it). */
export type PomodoroOnEnd = "advance" | "bell" | "none";

export function usePomodoro(
  a: PomodoroAttrs,
  /** Writes the block's attrs; null when it can't be changed from here. */
  update: ((attrs: Partial<PomodoroAttrs>) => void) | null,
  onEnd: PomodoroOnEnd,
) {
  const { t } = useTranslation();
  const running = a.startedAt != null;

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(id);
  }, [running]);

  const left = remainingAt(a, running ? now : 0);
  const total = phaseMs(a, a.phase);
  const progress = 1 - left / total;

  // The phase ran out: ring once, then move on (whoever can edit does it;
  // two people doing it at once write the same values).
  const endedRef = useRef<string | null>(null);
  useEffect(() => {
    if (onEnd === "none" || !running || left > 0) return;
    const id = `${a.phase}-${a.round}-${a.startedAt}`;
    if (endedRef.current === id) return;
    endedRef.current = id;
    if (a.sound === "bell") playBell();
    if (onEnd === "advance" && update) update(advance(a, Date.now()));
  }, [onEnd, running, left, a, update]);

  const set = (attrs: Partial<PomodoroAttrs>) => update?.(attrs);
  const start = () => set({ startedAt: Date.now() });
  const pause = () =>
    set({ startedAt: null, remainingMs: remainingAt(a, Date.now()) });
  const reset = () => set({ startedAt: null, remainingMs: phaseMs(a, a.phase) });
  const skip = () => set(advance({ ...a, autoStart: running }, Date.now()));

  const phaseLabel: Record<PomodoroPhase, string> = {
    focus: t("pomodoro.focus"),
    short: t("pomodoro.shortBreak"),
    long: t("pomodoro.longBreak"),
  };

  return {
    running,
    left,
    progress,
    clock: formatClock(left),
    canEdit: update !== null,
    start,
    pause,
    reset,
    skip,
    phaseLabel,
    roundLabel: t("pomodoro.round", { round: a.round, rounds: a.rounds }),
  };
}

export type PomodoroState = ReturnType<typeof usePomodoro>;

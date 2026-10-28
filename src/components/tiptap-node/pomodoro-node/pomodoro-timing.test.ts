import { describe, expect, it } from "vitest";
import {
  advance,
  formatClock,
  POMODORO_DEFAULTS,
  remainingAt,
  type PomodoroAttrs,
} from "./pomodoro-timing";

const base: PomodoroAttrs = { ...POMODORO_DEFAULTS };

describe("pomodoro timing", () => {
  it("counts down from when it was started", () => {
    const a = { ...base, startedAt: 1_000, remainingMs: 60_000 };
    expect(remainingAt(a, 31_000)).toBe(30_000);
    expect(remainingAt(a, 999_999)).toBe(0);
    expect(remainingAt({ ...a, startedAt: null }, 999_999)).toBe(60_000);
  });

  it("goes focus → short break → focus, and a long break after the last round", () => {
    expect(advance({ ...base, phase: "focus", round: 1 }, 0)).toMatchObject({
      phase: "short",
      round: 1,
      remainingMs: 5 * 60_000,
      startedAt: null,
    });
    expect(advance({ ...base, phase: "short", round: 1 }, 0)).toMatchObject({
      phase: "focus",
      round: 2,
    });
    expect(advance({ ...base, phase: "focus", round: 4 }, 0)).toMatchObject({
      phase: "long",
      remainingMs: 15 * 60_000,
    });
    expect(advance({ ...base, phase: "long", round: 4 }, 0)).toMatchObject({
      phase: "focus",
      round: 1,
    });
  });

  it("starts the next round by itself when asked", () => {
    expect(advance({ ...base, autoStart: true }, 42)).toMatchObject({
      startedAt: 42,
    });
  });

  it("formats the clock", () => {
    expect(formatClock(25 * 60_000)).toBe("25:00");
    expect(formatClock(924_000)).toBe("15:24");
    expect(formatClock(1_500)).toBe("0:02");
    expect(formatClock(3_723_000)).toBe("1:02:03");
  });
});

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import {
  MaterialIcon,
  Pause,
  Play,
  RotateCcw,
  Timer,
} from "src/components/icons";
import {
  advance,
  formatClock,
  phaseMs,
  playBell,
  remainingAt,
  type PomodoroAttrs,
  type PomodoroLook,
  type PomodoroPhase,
} from "./pomodoro-timing";
import "./pomodoro-node.scss";

// The Pomodoro block: the clock in its chosen look and the controls (reset,
// start / pause, skip). Its options are in the block menu
// (pomodoro-menu-actions.tsx). Only people who can edit the page can start
// or change it; everyone sees the same clock.

const TICK_MS = 250;

export function PomodoroView({
  node,
  updateAttributes,
  editor,
}: NodeViewProps) {
  const { t } = useTranslation();
  const a = node.attrs as PomodoroAttrs;
  const running = a.startedAt != null;
  const editable = editor.isEditable;

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
    if (!running || left > 0) return;
    const id = `${a.phase}-${a.round}-${a.startedAt}`;
    if (endedRef.current === id) return;
    endedRef.current = id;
    if (a.sound === "bell") playBell();
    if (editable) updateAttributes(advance(a, Date.now()));
  }, [running, left, a, editable, updateAttributes]);

  const start = () => updateAttributes({ startedAt: Date.now() });
  const pause = () =>
    updateAttributes({
      startedAt: null,
      remainingMs: remainingAt(a, Date.now()),
    });
  const reset = () =>
    updateAttributes({ startedAt: null, remainingMs: phaseMs(a, a.phase) });
  const skip = () =>
    updateAttributes(advance({ ...a, autoStart: running }, Date.now()));

  const phaseLabel: Record<PomodoroPhase, string> = {
    focus: t("pomodoro.focus"),
    short: t("pomodoro.shortBreak"),
    long: t("pomodoro.longBreak"),
  };
  const roundLabel = t("pomodoro.round", { round: a.round, rounds: a.rounds });
  const clock = formatClock(left);

  const controls = (
    <div className="pomodoro__controls">
      <button
        type="button"
        className="pomodoro__btn"
        onClick={reset}
        disabled={!editable}
        aria-label={t("pomodoro.reset")}
      >
        <RotateCcw />
      </button>
      <button
        type="button"
        className="pomodoro__btn is-main"
        onClick={running ? pause : start}
        disabled={!editable}
        aria-label={running ? t("pomodoro.pause") : t("pomodoro.start")}
      >
        {running ? <Pause /> : <Play />}
      </button>
      <button
        type="button"
        className="pomodoro__btn"
        onClick={skip}
        disabled={!editable}
        aria-label={t("pomodoro.skip")}
      >
        <MaterialIcon name="skip_next" />
      </button>
    </div>
  );

  const looks: Record<PomodoroLook, React.ReactNode> = {
    ring: (
      <RingLook
        progress={progress}
        clock={clock}
        sub={`${phaseLabel[a.phase]} · ${roundLabel}`}
      />
    ),
    clock: (
      <ClockLook progress={progress} clock={clock} left={t("pomodoro.left")} />
    ),
    line: (
      <LineLook progress={progress} clock={clock} label={phaseLabel[a.phase]} />
    ),
    flip: (
      <FlipLook clock={clock} sub={`${phaseLabel[a.phase]} · ${roundLabel}`} />
    ),
    sheet: <SheetLook left={left} sub={t("pomodoro.minutesLeft")} />,
  };

  return (
    <NodeViewWrapper
      className="pomodoro"
      data-look={a.look}
      data-size={a.size}
      data-phase={a.phase}
      style={{ "--pomo-color": a.color } as CSSProperties}
      contentEditable={false}
    >
      <div className="pomodoro__card">
        <div className="pomodoro__head">
          <Timer className="pomodoro__head-icon" />
          <span>{phaseLabel[a.phase]}</span>
          <span className="pomodoro__round">{roundLabel}</span>
        </div>
        <div className="pomodoro__face">{looks[a.look]}</div>
        {a.look !== "line" && controls}
        {a.look === "line" && (
          <div className="pomodoro__line-controls">{controls}</div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

// ── The five looks ──────────────────────────────────────────────────────────

function RingLook({
  progress,
  clock,
  sub,
}: {
  progress: number;
  clock: string;
  sub: string;
}) {
  const r = 70;
  const c = 2 * Math.PI * r;
  return (
    <div className="pomodoro-ring">
      <svg viewBox="0 0 160 160" aria-hidden="true">
        <circle cx="80" cy="80" r={r} className="pomodoro-ring__track" />
        <circle
          cx="80"
          cy="80"
          r={r}
          className="pomodoro-ring__bar"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
        />
      </svg>
      <div className="pomodoro-ring__center">
        <span className="pomodoro__time">{clock}</span>
        <span className="pomodoro__sub">{sub}</span>
      </div>
    </div>
  );
}

function ClockLook({
  progress,
  clock,
  left,
}: {
  progress: number;
  clock: string;
  left: string;
}) {
  const angle = progress * 2 * Math.PI;
  const x = 80 + 66 * Math.sin(angle);
  const y = 80 - 66 * Math.cos(angle);
  const hx = 80 + 52 * Math.sin(angle);
  const hy = 80 - 52 * Math.cos(angle);
  const large = progress > 0.5 ? 1 : 0;
  return (
    <div className="pomodoro-clock">
      <svg viewBox="0 0 160 160" aria-hidden="true">
        <circle cx="80" cy="80" r="74" className="pomodoro-clock__face" />
        {progress > 0 && progress < 1 && (
          <path
            d={`M80 80 L80 14 A66 66 0 ${large} 1 ${x} ${y} Z`}
            className="pomodoro-clock__wedge"
          />
        )}
        {Array.from({ length: 60 }, (_, i) => {
          const a = (i * Math.PI) / 30;
          const inner = i % 5 === 0 ? 58 : 62;
          return (
            <line
              key={i}
              x1={80 + 66 * Math.sin(a)}
              y1={80 - 66 * Math.cos(a)}
              x2={80 + inner * Math.sin(a)}
              y2={80 - inner * Math.cos(a)}
              className={
                i % 5 === 0
                  ? "pomodoro-clock__tick is-hour"
                  : "pomodoro-clock__tick"
              }
            />
          );
        })}
        <line
          x1="80"
          y1="80"
          x2={hx}
          y2={hy}
          className="pomodoro-clock__hand"
        />
        <circle cx="80" cy="80" r="4" className="pomodoro-clock__pin" />
      </svg>
      <div className="pomodoro__time is-small">
        {clock} <span className="pomodoro__sub">{left}</span>
      </div>
    </div>
  );
}

function LineLook({
  progress,
  clock,
  label,
}: {
  progress: number;
  clock: string;
  label: string;
}) {
  return (
    <div className="pomodoro-line">
      <div className="pomodoro-line__top">
        <b>{label}</b>
        <span className="pomodoro__time is-inline">{clock}</span>
      </div>
      <div className="pomodoro-line__track">
        <div
          className="pomodoro-line__bar"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}

function FlipLook({ clock, sub }: { clock: string; sub: string }) {
  return (
    <div className="pomodoro-flip">
      <div className="pomodoro-flip__digits">
        {clock.split("").map((ch, i) =>
          ch === ":" ? (
            <span key={i} className="pomodoro-flip__colon">
              :
            </span>
          ) : (
            // key on the digit: a new digit replays the flip.
            <span key={`${i}-${ch}`} className="pomodoro-flip__digit">
              {ch}
            </span>
          ),
        )}
      </div>
      <span className="pomodoro__sub">{sub}</span>
    </div>
  );
}

function SheetLook({ left, sub }: { left: number; sub: string }) {
  const minutes = Math.ceil(left / 60_000);
  return (
    <div className="pomodoro-sheet">
      <div className="pomodoro-sheet__stack">
        <span className="pomodoro-sheet__under is-2" />
        <span className="pomodoro-sheet__under is-1" />
        <div className="pomodoro-sheet__page">
          <span className="pomodoro-sheet__num">{minutes}</span>
          <span className="pomodoro__sub">{sub}</span>
        </div>
        {/* The page that was on top flips over the rings each minute. */}
        <div
          key={minutes}
          className="pomodoro-sheet__page is-turning"
          aria-hidden="true"
        >
          <span className="pomodoro-sheet__num">{minutes + 1}</span>
          <span className="pomodoro__sub">{sub}</span>
        </div>
        <span className="pomodoro-sheet__ring is-left" />
        <span className="pomodoro-sheet__ring is-right" />
      </div>
    </div>
  );
}

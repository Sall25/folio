import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import {
  MaterialIcon,
  Pause,
  Play,
  RotateCcw,
  Timer,
} from "src/components/icons";
import type { PomodoroAttrs, PomodoroLook } from "./pomodoro-timing";
import {
  usePomodoro,
  type PomodoroOnEnd,
  type PomodoroState,
} from "./use-pomodoro";
import "./pomodoro-node.scss";

// The Pomodoro's card (the clock in its look, and the controls), drawn by
// the block (pomodoro-view.tsx) and by its copies: a "Mine" / "Team" pin in
// the pins pane and a live view (PomodoroMirror).

/** The attributes the block's own wrapper carries (look, size, colour). */
// eslint-disable-next-line react-refresh/only-export-components
export function pomodoroBlockAttrs(a: PomodoroAttrs) {
  return {
    "data-look": a.look,
    "data-size": a.size,
    "data-phase": a.phase,
    style: { "--pomo-color": a.color } as CSSProperties,
  };
}

export function PomodoroCard({ a, p }: { a: PomodoroAttrs; p: PomodoroState }) {
  const { t } = useTranslation();
  const controls = (
    <div className="pomodoro__controls">
      <button
        type="button"
        className="pomodoro__btn"
        onClick={p.reset}
        disabled={!p.canEdit}
        aria-label={t("pomodoro.reset")}
      >
        <RotateCcw />
      </button>
      <button
        type="button"
        className="pomodoro__btn is-main"
        onClick={p.running ? p.pause : p.start}
        disabled={!p.canEdit}
        aria-label={p.running ? t("pomodoro.pause") : t("pomodoro.start")}
      >
        {p.running ? <Pause /> : <Play />}
      </button>
      <button
        type="button"
        className="pomodoro__btn"
        onClick={p.skip}
        disabled={!p.canEdit}
        aria-label={t("pomodoro.skip")}
      >
        <MaterialIcon name="skip_next" />
      </button>
    </div>
  );

  const looks: Record<PomodoroLook, React.ReactNode> = {
    ring: (
      <RingLook
        progress={p.progress}
        clock={p.clock}
        sub={`${p.phaseLabel[a.phase]} · ${p.roundLabel}`}
      />
    ),
    clock: (
      <ClockLook
        progress={p.progress}
        clock={p.clock}
        left={t("pomodoro.left")}
      />
    ),
    line: (
      <LineLook
        progress={p.progress}
        clock={p.clock}
        label={p.phaseLabel[a.phase]}
      />
    ),
    flip: (
      <FlipLook
        clock={p.clock}
        sub={`${p.phaseLabel[a.phase]} · ${p.roundLabel}`}
      />
    ),
    sheet: <SheetLook left={p.left} sub={t("pomodoro.minutesLeft")} />,
  };

  const card = (
    <div className="pomodoro__card">
      <div className="pomodoro__head">
        <Timer className="pomodoro__head-icon" />
        <span>{p.phaseLabel[a.phase]}</span>
        <span className="pomodoro__round">{p.roundLabel}</span>
      </div>
      <div className="pomodoro__face">{looks[a.look]}</div>
      {a.look !== "line" && controls}
      {a.look === "line" && (
        <div className="pomodoro__line-controls">{controls}</div>
      )}
    </div>
  );
  return card;
}

/** A copy of a Pomodoro block, ticking on its own from the block's attrs.
 *  `update` writes to the block (it's in this page), or null (another page:
 *  the clock shows, the controls are off). */
export function PomodoroMirror({
  attrs,
  update,
  onEnd,
}: {
  attrs: PomodoroAttrs;
  update: ((attrs: Partial<PomodoroAttrs>) => void) | null;
  onEnd: PomodoroOnEnd;
}) {
  const p = usePomodoro(attrs, update, onEnd);
  return (
    <div className="pomodoro" {...pomodoroBlockAttrs(attrs)}>
      <PomodoroCard a={attrs} p={p} />
    </div>
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

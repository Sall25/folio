import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Square, Timer } from "lucide-react";
import { Avatar } from "src/components/tiptap-ui-primitive/avatar";
import type { ChatPerson } from "src/types";
import {
  STUDY_PRESETS,
  sessionStateAt,
  useTicker,
  type StudySessionApi,
} from "src/hooks/use-study-session";
import "./study-session.scss";

// Two soft tones: rising when focus starts, falling for a break / the end.
function playChime(kind: "focus" | "break" | "done") {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    const tones = kind === "focus" ? [523.25, 659.25] : [659.25, 523.25];
    tones.forEach((freq, i) => {
      const at = ctx.currentTime + i * 0.18;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.15, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.4);
    });
    window.setTimeout(() => ctx.close(), 1200);
  } catch {
    /* audio unavailable — the banner still shows the switch */
  }
}

function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Start button with the three presets.
export function StudyStartMenu({
  study,
  compact = false,
}: {
  study: StudySessionApi;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div className="study-start" ref={ref}>
      <button
        type="button"
        className={`study-start__trigger${compact ? " is-compact" : ""}`}
        onClick={() => setOpen((v) => !v)}
        disabled={study.start.isPending}
        title={t("study.start", "Start a study session")}
      >
        <Timer size={15} />
        <span>{t("study.start", "Start a study session")}</span>
      </button>
      {open && (
        <div className="study-start__menu" role="menu">
          {STUDY_PRESETS.map((p) => (
            <button
              key={`${p.focus}-${p.rest}`}
              type="button"
              className="study-start__option"
              onClick={() => {
                setOpen(false);
                study.start.mutate({
                  focus: p.focus,
                  rest: p.rest,
                  rounds: p.rounds,
                });
              }}
            >
              <strong>
                {t("study.preset", {
                  focus: p.focus,
                  rest: p.rest,
                  defaultValue: "{{focus}} min focus · {{rest}} min break",
                })}
              </strong>
              <small>
                {t("study.rounds", {
                  count: p.rounds,
                  defaultValue: "{{count}} rounds",
                })}
              </small>
            </button>
          ))}
        </div>
      )}
      {study.start.error && (
        <span className="study-start__error">{study.start.error.message}</span>
      )}
    </div>
  );
}

// The live banner (or, when asked, a slim "start" row while idle).
export function StudySessionBar({
  study,
  meId,
  canPost,
  canStop,
  peopleById,
  showIdleStart,
}: {
  study: StudySessionApi;
  meId: string | undefined;
  canPost: boolean;
  canStop: boolean;
  peopleById: Map<string, ChatPerson>;
  showIdleStart: boolean;
}) {
  const { t } = useTranslation();
  const { session, participants } = study;
  const now = useTicker(!!session);
  const state = session && now ? sessionStateAt(session, now) : null;
  const active = !!state && state.phase !== "done";
  const isParticipant = !!meId && participants.includes(meId);

  // Chime on every phase switch, for people in the session.
  const prevPhase = useRef<string | null>(null);
  const phase = state?.phase ?? null;
  useEffect(() => {
    const prev = prevPhase.current;
    prevPhase.current = phase;
    if (!prev || !phase || prev === phase || !isParticipant) return;
    playChime(phase);
  }, [phase, isParticipant]);

  if (!active || !session || !state) {
    return showIdleStart && canPost ? (
      <div className="study-idle">
        <StudyStartMenu study={study} compact />
      </div>
    ) : null;
  }

  const progress = 1 - state.remainingMs / state.phaseMs;

  return (
    <div className={`study-bar is-${state.phase}`}>
      <div className="study-bar__main">
        <span className="study-bar__phase">
          <Timer size={14} />
          {state.phase === "focus"
            ? t("study.focus", "Focus")
            : t("study.break", "Break")}
        </span>
        <span className="study-bar__clock">
          {formatClock(state.remainingMs)}
        </span>
        <span className="study-bar__round">
          {t("study.roundOf", {
            round: state.round,
            total: session.rounds,
            defaultValue: "Round {{round}}/{{total}}",
          })}
        </span>

        <span className="study-bar__people">
          {participants.slice(0, 5).map((id) => {
            const p = peopleById.get(id);
            return (
              <span key={id} className="study-bar__avatar" title={p?.name}>
                <Avatar
                  size="sm"
                  src={p?.avatarUrl ?? undefined}
                  name={p?.name ?? "?"}
                />
              </span>
            );
          })}
          {participants.length > 5 && (
            <span className="study-bar__more">+{participants.length - 5}</span>
          )}
        </span>

        <span className="study-bar__actions">
          {canPost &&
            (isParticipant ? (
              <button
                type="button"
                className="study-bar__btn"
                disabled={study.leave.isPending}
                onClick={() => study.leave.mutate(session.id)}
              >
                {t("study.leave", "Leave")}
              </button>
            ) : (
              <button
                type="button"
                className="study-bar__btn is-primary"
                disabled={study.join.isPending}
                onClick={() => study.join.mutate(session.id)}
              >
                {t("study.join", "Join")}
              </button>
            ))}
          {canStop && (
            <button
              type="button"
              className="study-bar__btn study-bar__btn--icon"
              aria-label={t("study.stop", "Stop session")}
              title={t("study.stop", "Stop session")}
              disabled={study.stop.isPending}
              onClick={() => study.stop.mutate(session.id)}
            >
              <Square size={12} />
            </button>
          )}
        </span>
      </div>
      <div className="study-bar__track" aria-hidden="true">
        <div
          className="study-bar__fill"
          style={{ transform: `scaleX(${Math.min(1, Math.max(0, progress))})` }}
        />
      </div>
    </div>
  );
}

import { createPortal } from "react-dom";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import { Pause, Play, Timer } from "src/components/icons";
import type { PomodoroAttrs } from "./pomodoro-timing";
import {
  PinFrame,
  PinStub,
  scrollToBlock,
  usePinTarget,
} from "src/features/editor/pins";
import { usePomodoro } from "./use-pomodoro";
import { PomodoroCard, pomodoroBlockAttrs } from "./pomodoro-card";
import "./pomodoro-node.scss";

// The Pomodoro block: the clock in its chosen look and the controls (reset,
// start / pause, skip), in pomodoro-card.tsx. Its options are in the block
// menu (pomodoro-menu-actions.tsx). Only people who can edit the page can
// start or change it; everyone sees the same clock.

export function PomodoroView({
  node,
  updateAttributes,
  editor,
  getPos,
}: NodeViewProps) {
  const { t } = useTranslation();
  const a = node.attrs as PomodoroAttrs;
  const editable = editor.isEditable;
  const p = usePomodoro(a, editable ? updateAttributes : null, "advance");
  const { running, start, pause, phaseLabel, roundLabel, clock } = p;
  const card = <PomodoroCard a={a} p={p} />;
  const blockAttrs = pomodoroBlockAttrs(a);

  // Pinned (pin-targets.ts): drawn in the rail and / or as a chip in the
  // top bar; in the page, a stub when it's in the rail.
  const pins = node.attrs as { pinSide?: boolean; pinTop?: boolean };
  const side = usePinTarget(editor, "side", !!pins.pinSide);
  const top = usePinTarget(editor, "top", !!pins.pinTop);
  const label = t("pins.labels.pomodoro");
  const goTo = () => scrollToBlock(editor, getPos());
  const unpin = (key: "pinSide" | "pinTop") =>
    editable ? () => updateAttributes({ [key]: false }) : undefined;

  const chip = top
    ? createPortal(
        <div className="pomodoro-chip" {...blockAttrs}>
          <button
            type="button"
            className="pomodoro-chip__label"
            onClick={goTo}
            title={t("pins.goTo")}
          >
            <Timer className="pomodoro-chip__icon" />
            <span>
              {phaseLabel[a.phase]} · {clock}
            </span>
          </button>
          <button
            type="button"
            className="pomodoro-chip__btn"
            onClick={running ? pause : start}
            disabled={!editable}
            aria-label={running ? t("pomodoro.pause") : t("pomodoro.start")}
          >
            {running ? <Pause /> : <Play />}
          </button>
        </div>,
        top,
      )
    : null;

  if (side) {
    return (
      <NodeViewWrapper className="pomodoro-pinned" contentEditable={false}>
        <PinStub
          icon="timer"
          label={label}
          where={pins.pinTop ? t("pins.whereBoth") : t("pins.whereSide")}
          onShowHere={unpin("pinSide")}
        />
        {createPortal(
          <PinFrame
            icon="timer"
            label={label}
            order={getPos() ?? 0}
            extra={<span className="pomodoro__round">{roundLabel}</span>}
            onGoTo={goTo}
            onUnpin={unpin("pinSide")}
          >
            <div className="pomodoro" {...blockAttrs}>
              {card}
            </div>
          </PinFrame>,
          side,
        )}
        {chip}
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      className="pomodoro"
      {...blockAttrs}
      contentEditable={false}
    >
      {card}
      {chip}
    </NodeViewWrapper>
  );
}

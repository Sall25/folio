import type { CSSProperties } from "react";
import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import {
  createIcon,
  RotateCcw,
  type IconComponent,
} from "src/components/icons";
import { MenuRow } from "src/features/database/components/menu-row";
import { NavigableMenuItem } from "src/features/database/components/navigable-menu-item";
import {
  phaseMs,
  type PomodoroAttrs,
  type PomodoroLook,
  type PomodoroSize,
} from "./pomodoro-timing";
import { menuTarget } from "./pomodoro-menu-target";

// The Pomodoro block's options, as rows of the block menu (the drag handle's
// menu): Look, Colour, Size and Timing open a flyout; the sound and
// auto-start are toggles; Reset puts the clock back to the start of the
// phase. Shown only when the menu is for one Pomodoro block.

const LOOKS: PomodoroLook[] = ["ring", "clock", "line", "flip", "sheet"];
const SIZES: PomodoroSize[] = ["small", "medium", "full"];
const COLORS = [
  { name: "red", value: "#e5484d" },
  { name: "orange", value: "#f76b15" },
  { name: "yellow", value: "#e2b203" },
  { name: "green", value: "#30a46c" },
  { name: "blue", value: "#2383e2" },
  { name: "purple", value: "#8e4ec6" },
] as const;

const LookIcon = createIcon("PomodoroViewCarousel", "view_carousel");
const ColorIcon = createIcon("PomodoroPalette", "palette");
const SizeIcon = createIcon("PomodoroWidth", "width");
const TimingIcon = createIcon("PomodoroTimer", "timer");
const SoundIcon = createIcon("PomodoroNotifications", "notifications");
const AutoStartIcon = createIcon("PomodoroAutoplay", "autoplay");

const LOOK_ICONS: Record<PomodoroLook, IconComponent> = {
  ring: createIcon("PomodoroRadioButtonChecked", "radio_button_checked"),
  clock: createIcon("PomodoroSchedule", "schedule"),
  line: createIcon("PomodoroLinearScale", "linear_scale"),
  flip: createIcon("PomodoroFilter9Plus", "filter_9_plus"),
  sheet: createIcon("PomodoroEventNote", "event_note"),
};

function patch(editor: Editor, pos: number, attrs: Partial<PomodoroAttrs>) {
  editor
    .chain()
    .command(({ tr }) => {
      for (const [key, value] of Object.entries(attrs)) {
        tr.setNodeAttribute(pos, key, value);
      }
      return true;
    })
    .run();
}

type LengthKey = "focus" | "shortBreak" | "longBreak";

/** A new length for a phase. When it's the phase showing and the clock is
 *  stopped at its start, the clock shows the new length straight away;
 *  otherwise it applies the next time that phase comes round. */
function lengthPatch(
  a: PomodoroAttrs,
  key: LengthKey,
  minutes: number,
): Partial<PomodoroAttrs> {
  const showing: LengthKey =
    a.phase === "focus"
      ? "focus"
      : a.phase === "short"
        ? "shortBreak"
        : "longBreak";
  const atStart = a.startedAt == null && a.remainingMs === phaseMs(a, a.phase);
  if (showing !== key || !atStart) return { [key]: minutes };
  return {
    [key]: minutes,
    remainingMs: phaseMs({ ...a, [key]: minutes }, a.phase),
  };
}

function NumberRow({
  label,
  unit,
  value,
  max,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="pomodoro-menu__num">
      <span>{label}</span>
      <input
        type="number"
        min={1}
        max={max}
        value={value}
        // Keep the block menu's keyboard handling out of the field.
        onKeyDown={(e) => e.stopPropagation()}
        onChange={(e) => {
          const n = Math.round(Number(e.target.value));
          if (Number.isFinite(n) && n >= 1 && n <= max) onChange(n);
        }}
      />
      <span className="pomodoro-menu__unit">{unit}</span>
    </label>
  );
}

const FLYOUT = {
  side: "right",
  align: "start",
  sideOffset: 8,
  collisionPadding: 8,
  // Above the block menu (9999).
  zIndex: 10000,
} as const;

export function PomodoroMenuActions({
  editor,
  onAction,
}: {
  editor: Editor;
  onAction?: () => void;
}) {
  const { t } = useTranslation();
  // Re-read when the selection or the block changes.
  const target = useEditorState({
    editor,
    selector: ({ editor: e }) => (e ? menuTarget(e) : null),
  });
  if (!target) return null;

  const a = target.node.attrs as PomodoroAttrs;
  const set = (attrs: Partial<PomodoroAttrs>) =>
    patch(editor, target.pos, attrs);

  return (
    <>
      <NavigableMenuItem
        {...FLYOUT}
        Icon={LookIcon}
        label={t("pomodoro.look")}
        sub={t(`pomodoro.looks.${a.look}`)}
      >
        <div className="pomodoro-menu">
          {LOOKS.map((look) => (
            <MenuRow
              key={look}
              Icon={LOOK_ICONS[look]}
              label={t(`pomodoro.looks.${look}`)}
              selected={a.look === look}
              onClick={() => set({ look })}
            />
          ))}
        </div>
      </NavigableMenuItem>

      <NavigableMenuItem
        {...FLYOUT}
        Icon={ColorIcon}
        label={t("pomodoro.color")}
      >
        <div className="pomodoro-menu">
          <div className="pomodoro-menu__colors">
            {COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                aria-label={t(`slash.colors.${c.name}`)}
                title={t(`slash.colors.${c.name}`)}
                data-active={a.color === c.value || undefined}
                style={
                  { background: c.value, "--swatch": c.value } as CSSProperties
                }
                onClick={() => set({ color: c.value })}
              />
            ))}
          </div>
        </div>
      </NavigableMenuItem>

      <NavigableMenuItem
        {...FLYOUT}
        Icon={SizeIcon}
        label={t("pomodoro.size")}
        sub={t(`pomodoro.sizes.${a.size}`)}
      >
        <div className="pomodoro-menu">
          {SIZES.map((size) => (
            <MenuRow
              key={size}
              label={t(`pomodoro.sizes.${size}`)}
              selected={a.size === size}
              onClick={() => set({ size })}
            />
          ))}
        </div>
      </NavigableMenuItem>

      <NavigableMenuItem
        {...FLYOUT}
        Icon={TimingIcon}
        label={t("pomodoro.timing")}
        sub={`${a.focus} · ${a.shortBreak} · ${a.longBreak}`}
      >
        <div className="pomodoro-menu is-timing">
          <NumberRow
            label={t("pomodoro.focus")}
            unit={t("pomodoro.min")}
            value={a.focus}
            max={180}
            onChange={(n) => set(lengthPatch(a, "focus", n))}
          />
          <NumberRow
            label={t("pomodoro.shortBreak")}
            unit={t("pomodoro.min")}
            value={a.shortBreak}
            max={60}
            onChange={(n) => set(lengthPatch(a, "shortBreak", n))}
          />
          <NumberRow
            label={t("pomodoro.longBreak")}
            unit={t("pomodoro.min")}
            value={a.longBreak}
            max={90}
            onChange={(n) => set(lengthPatch(a, "longBreak", n))}
          />
          <NumberRow
            label={t("pomodoro.longBreakEvery")}
            unit={t("pomodoro.rounds", { count: a.rounds })}
            value={a.rounds}
            max={12}
            onChange={(rounds) =>
              set({ rounds, round: Math.min(a.round, rounds) })
            }
          />
        </div>
      </NavigableMenuItem>

      <MenuRow
        toggle
        Icon={SoundIcon}
        label={t("pomodoro.sound")}
        checked={a.sound === "bell"}
        onToggle={(on) =>
          set({ sound: (on ?? a.sound !== "bell") ? "bell" : "none" })
        }
      />
      <MenuRow
        toggle
        Icon={AutoStartIcon}
        label={t("pomodoro.autoStart")}
        checked={a.autoStart}
        onToggle={(on) => set({ autoStart: on ?? !a.autoStart })}
      />
      <MenuRow
        Icon={RotateCcw}
        label={t("pomodoro.resetTimer")}
        onClick={() => {
          set({ startedAt: null, remainingMs: phaseMs(a, a.phase) });
          onAction?.();
        }}
      />
    </>
  );
}

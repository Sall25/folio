import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { MaterialIcon } from "src/components/icons";
import { useMediaQuery } from "src/hooks/use-breakpoint";
import { pinTargets } from "./pin-targets";
import "./pins.scss";

// The places pinned blocks are drawn (the rail, the top-bar slot), the frame
// around a block in the rail, and the stub left where the block lives.

/** The rail beside the page. Only on wide screens: narrower, pinned blocks
 *  stay in the page (nothing registers, so they draw in place). */
export function PinRail() {
  const wide = useMediaQuery("min", "xl");
  if (!wide) return null;
  return (
    <aside
      className="pin-rail"
      ref={(el) => {
        pinTargets.set("side", el);
        return () => pinTargets.set("side", null);
      }}
    />
  );
}

/** The slot in the top bar (pinned to top: the Pomodoro's chip). */
export function PinTopSlot() {
  return (
    <span
      className="pin-top-slot"
      ref={(el) => {
        pinTargets.set("top", el);
        return () => pinTargets.set("top", null);
      }}
    />
  );
}

/** A block in the rail: its name (click → the block in the page), an unpin
 *  button, then the block. Ordered as in the page (`order` = position). */
export function PinFrame({
  icon,
  label,
  order,
  extra,
  onGoTo,
  onUnpin,
  children,
}: {
  icon: string;
  label: string;
  order: number;
  extra?: ReactNode;
  onGoTo: () => void;
  onUnpin?: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <section className="pin-frame" style={{ order }}>
      <header className="pin-frame__head">
        <button
          type="button"
          className="pin-frame__name"
          onClick={onGoTo}
          title={t("pins.goTo")}
        >
          <MaterialIcon name={icon} size={15} />
          <span>{label}</span>
        </button>
        {extra}
        {onUnpin && (
          <button
            type="button"
            className="pin-frame__unpin"
            onClick={onUnpin}
            aria-label={t("pins.unpin")}
            title={t("pins.unpin")}
          >
            <MaterialIcon name="keep" size={15} />
          </button>
        )}
      </header>
      <div className="pin-frame__body">{children}</div>
    </section>
  );
}

/** Left in the page where a block pinned to the side lives. */
export function PinStub({
  icon,
  label,
  where,
  onShowHere,
}: {
  icon: string;
  label: string;
  where: string;
  onShowHere?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="pin-stub">
      <MaterialIcon name={icon} size={16} />
      <span className="pin-stub__text">
        <b>{label}</b> · {t("pins.pinnedTo", { where })}
      </span>
      {onShowHere && (
        <button type="button" className="pin-stub__btn" onClick={onShowHere}>
          {t("pins.showHere")}
        </button>
      )}
    </div>
  );
}

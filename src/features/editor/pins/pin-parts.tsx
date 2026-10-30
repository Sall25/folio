import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { MaterialIcon } from "src/components/icons";
import { useMediaQuery } from "src/hooks/use-breakpoint";
import { pinTargets } from "./pin-targets";
import "./pins.scss";

// The places pinned blocks are drawn (the rail, the top-bar slot), the frame
// around a block in the rail, and the stub left where the block lives.

/** The rail beside the page. Only on wide screens: narrower, pinned blocks
 *  stay in the page (nothing registers, so they draw in place).
 *
 *  Its top lines up with the page title: it follows the title while the
 *  page scrolls, and stops under the top bar once the title has gone up. */
export function PinRail() {
  const wide = useMediaQuery("min", "xl");
  const [rail, setRail] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!rail) return;
    let frame = 0;
    const place = () => {
      frame = 0;
      const title = document.querySelector<HTMLElement>(
        '.simple-editor-main [data-type="title"]',
      );
      // No title (still loading): the CSS fallback (under the top bar).
      if (!title) return rail.style.removeProperty("--pin-rail-top");
      rail.style.setProperty(
        "--pin-rail-top",
        `${Math.round(title.getBoundingClientRect().top)}px`,
      );
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(place);
    };
    place();
    // The page scrolls inside its own container: listen in the capture
    // phase to hear every scroll. A cover loading or the window resizing
    // moves the title too.
    document.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    const main = document.querySelector(".simple-editor-main");
    const observer = new ResizeObserver(schedule);
    if (main) observer.observe(main);
    // The title can mount after the rail (page switch): re-check briefly.
    const poll = window.setInterval(schedule, 500);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      document.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
      window.clearInterval(poll);
    };
  }, [rail]);

  if (!wide) return null;
  return (
    <aside
      className="pin-rail"
      ref={(el) => {
        pinTargets.set("side", el);
        setRail(el);
        return () => {
          pinTargets.set("side", null);
          setRail(null);
        };
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
  className,
  icon,
  label,
  order,
  extra,
  onGoTo,
  onUnpin,
  children,
}: {
  className?: string;
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
    <section
      className={className ? `pin-frame ${className}` : "pin-frame"}
      style={{ order }}
    >
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

import { useEffect, useRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { MaterialIcon } from "src/components/icons";
import { useMediaQuery } from "src/hooks/use-breakpoint";
import { pinTargets } from "./pin-targets";
import "./pins.scss";

/** The rail beside the page. Only on wide screens: narrower, pinned blocks
 *  stay in the page (nothing registers, so they draw in place). Its top
 *  follows the page's icon — or its title — so it starts under the cover,
 *  then stays just under the top bar once that has scrolled away. */
export function PinRail() {
  const wide = useMediaQuery("min", "xl");
  const railRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!wide) return;
    let frame = 0;
    const place = () => {
      frame = 0;
      const rail = railRef.current;
      if (!rail) return;
      const anchor = document.querySelector<HTMLElement>(
        '.simple-editor-main h1[data-type="title"]',
      );
      const toolbar =
        document
          .querySelector<HTMLElement>('.tiptap-toolbar[data-variant="fixed"]')
          ?.getBoundingClientRect().bottom ?? 44;
      const min = toolbar + 16;
      const top = anchor
        ? Math.max(min, anchor.getBoundingClientRect().top)
        : min;
      rail.style.setProperty("--pin-rail-top", `${Math.round(top)}px`);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(place);
    };
    place();
    // Any scroll container (capture), window size, and page switches / the
    // cover loading (the interval: cheap, and catches what events miss).
    document.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    const interval = window.setInterval(schedule, 400);
    return () => {
      document.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      window.clearInterval(interval);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [wide]);

  if (!wide) return null;
  return (
    <aside
      className="pin-rail"
      ref={(el) => {
        railRef.current = el;
        pinTargets.set("side", el);
        return () => {
          railRef.current = null;
          pinTargets.set("side", null);
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

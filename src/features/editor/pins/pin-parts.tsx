import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { MaterialIcon } from "src/components/icons";
import { pinTargets } from "./pin-targets";
import { endPinDrag, startPinDrag, type PinDragPayload } from "./pin-drop";
import "./pins.scss";

// The top-bar slot (pinned to top), the frame around a block in the pins
// pane (pins-pane.tsx), and the stub left where a moved block lives.

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

/** A block in the pins pane: its name (click → the block in the page), a
 *  grip to drag it into the page (when `drag` gives the block), an unpin
 *  button, then the block. Ordered as in the page (`order` = position). */
export function PinFrame({
  className,
  icon,
  label,
  order,
  extra,
  onGoTo,
  onUnpin,
  drag,
  children,
}: {
  className?: string;
  icon: string;
  label: string;
  order: number;
  extra?: ReactNode;
  onGoTo: () => void;
  onUnpin?: () => void;
  /** The block to drag into the page, or null when there's none to give. */
  drag?: () => PinDragPayload | null;
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
        {drag && (
          // A span: Firefox won't start a drag from a <button>.
          <span
            className="pin-frame__grip"
            draggable
            title={t("pins.drag")}
            aria-label={t("pins.drag")}
            onDragStart={(e) => {
              const payload = drag();
              if (!payload) return e.preventDefault();
              startPinDrag(e.dataTransfer, payload);
              const card = e.currentTarget.closest(".pin-frame");
              if (card instanceof HTMLElement) {
                e.dataTransfer.setDragImage(card, 24, 16);
              }
            }}
            onDragEnd={endPinDrag}
          >
            <MaterialIcon name="drag_indicator" size={15} />
          </span>
        )}
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

import { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { MaterialIcon } from "src/components/icons";
import { canOpenBeside, useOpenBeside } from "./use-open-beside";
import "./split-drop-zone.scss";

// While a tab is dragged: the right half of the page becomes a drop zone,
// "Open beside". Dropping there opens that tab's page next to this one
// (use-open-beside.ts). Shown only when that's possible (both pages).

export function SplitDropZone({
  path,
  onDone,
}: {
  path: string;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const openBeside = useOpenBeside();
  const [over, setOver] = useState(false);
  if (!canOpenBeside(path)) return null;

  return createPortal(
    <div
      className="split-drop-zone"
      data-over={over || undefined}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        openBeside(path);
        onDone();
      }}
    >
      <div className="split-drop-zone__label">
        <MaterialIcon name="splitscreen_right" size={20} />
        {t("desktop.openBeside")}
      </div>
    </div>,
    document.body,
  );
}

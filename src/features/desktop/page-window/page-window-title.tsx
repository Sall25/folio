import { useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "@tanstack/react-location";
import { TITLE_BAR_SLOT_ID } from "../title-bar/desktop-title-bar";
import { useTabLabel } from "../tabs/tab-label";
import "./page-window-title.scss";

// The title bar of a page window (page-window.ts): the page's icon and
// title instead of tabs, live as it's renamed. The bar around it still
// drags the window.

export function PageWindowTitle() {
  const [slot] = useState(() => document.getElementById(TITLE_BAR_SLOT_ID));
  if (!slot) return null;
  return createPortal(<Title />, slot);
}

function Title() {
  const location = useLocation();
  const { title, icon } = useTabLabel(location.current.pathname);
  return (
    <div className="page-window-title" data-tauri-drag-region>
      <span className="page-window-title__icon">{icon}</span>
      <span className="page-window-title__text" data-tauri-drag-region>
        {title}
      </span>
    </div>
  );
}

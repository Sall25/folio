import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../src/styles/_variables.scss";
import "../src/styles/_keyframe-animations.scss";
import "../src/styles/_utilities.scss";
import "./i18n/config.ts";
import "material-symbols/rounded.css";
import "material-symbols/outlined.css";

// import './styles/main.scss'
import App from "./app/App.tsx";
import { installStaleChunkRecovery } from "./lib/stale-chunk-recovery";
import { applyStoredIconStyle } from "./components/icons/icon-style.ts";

// A deploy removes the old code chunks; a tab still on the old version
// reloads onto the new one instead of breaking (see the module).
installStaleChunkRecovery();

// The icon style chosen in My settings, before the first render.
applyStoredIconStyle();

// const originalError = console.error;
// console.error = (...args) => {
//   if (typeof args[0] === "string" && args[0].includes("flushSync")) return;
//   originalError(...args);
// };

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

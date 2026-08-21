import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../src/styles/_variables.scss";
import "../src/styles/_keyframe-animations.scss";
import "../src/styles/_utilities.scss";
import "./i18n/config.ts";
import "material-symbols/rounded.css";

// import './styles/main.scss'
import App from "./App.tsx";

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

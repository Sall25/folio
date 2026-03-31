import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../src/styles/_variables.scss";
import "../src/styles/_keyframe-animations.scss";

// import './styles/main.scss'
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

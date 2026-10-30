// The surface the page sits on for themes that float the page (Aurora,
// Retro): a fixed panel from the sidebar's edge to just inside the window,
// drawn BEHIND everything (z-index -1, see themes.scss). Hidden in every
// other theme. On phones it fills the screen.
//
// .theme-sky, behind it, is the sky's moving part (Midnight's twinkling and
// shooting stars); hidden in every other theme.
export function ThemeSheet({ left, flush }: { left: number; flush: boolean }) {
  return (
    <>
      <div aria-hidden="true" className="theme-sky" />
      <div
        aria-hidden="true"
        className={`theme-sheet${flush ? " theme-sheet--flush" : ""}`}
        style={{ left: flush ? 0 : left + 24 }}
      />
    </>
  );
}

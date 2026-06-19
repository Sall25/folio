import { Button } from "src/components/tiptap-ui-primitive/button";

// --- Icons ---
import { MoonStarIcon } from "src/components/tiptap-icons/moon-star-icon";
import { SunIcon } from "src/components/tiptap-icons/sun-icon";
import { useEffect, useState } from "react";

const THEME_KEY = "folio-theme";

function getInitialDarkMode(): boolean {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "dark") return true;
  if (stored === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeToggle() {
  // reads localStorage synchronously on first render
  const [isDarkMode, setIsDarkMode] = useState<boolean>(getInitialDarkMode);

  // writes on every toggle
  const toggleDarkMode = () =>
    setIsDarkMode((isDark) => {
      const next = !isDark;
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
      return next;
    });

  // Follow OS changes only while the user hasn't set an explicit preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (!localStorage.getItem(THEME_KEY)) {
        setIsDarkMode(mediaQuery.matches);
      }
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  return (
    <Button
      onClick={toggleDarkMode}
      aria-label={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
      variant="ghost"
    >
      {isDarkMode ? (
        <MoonStarIcon className="tiptap-button-icon" />
      ) : (
        <SunIcon className="tiptap-button-icon" />
      )}
    </Button>
  );
}

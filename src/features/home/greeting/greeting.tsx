import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

// Time-of-day greeting for the home page ("🌅 Good morning, Jule").
// Set in the app's own UI font, bold with tight tracking, like Notion's home
// heading, so it reads as part of the layout rather than a decorative serif.

type Period = "morning" | "afternoon" | "evening" | "night";

const EMOJI: Record<Period, string> = {
  morning: "🌅",
  afternoon: "☀️",
  evening: "🌆",
  night: "🌙",
};

function getPeriod(): Period {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 22) return "evening";
  return "night";
}

interface GreetingProps {
  name?: string;
  className?: string;
  /** A smaller line without the emoji (home's top of page). */
  compact?: boolean;
}

export function Greeting({ name, className, compact = false }: GreetingProps) {
  const { t } = useTranslation();
  const [period, setPeriod] = useState(getPeriod);

  // Re-check on each minute boundary so the greeting flips at 12:00, 18:00…
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const now = new Date();
    const msUntilNextMinute =
      (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    const timeout = setTimeout(() => {
      setPeriod(getPeriod());
      interval = setInterval(() => setPeriod(getPeriod()), 60_000);
    }, msUntilNextMinute);
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, []);

  const text = t(`greeting.${period}`);

  return (
    <h1
      className={className}
      style={{
        margin: 0,
        fontFamily: "inherit",
        // 30px from ~600px wide up; scales down to 20px on phones
        // (≈20px at 375px) so the greeting stays one calm line.
        fontSize: compact ? 20 : "clamp(20px, 5vw, 30px)",
        overflowWrap: "break-word",
        maxWidth: "100%",
        fontWeight: compact ? 600 : 700,
        lineHeight: 1.2,
        letterSpacing: compact ? "-0.01em" : "-0.02em",
        color: "inherit",
      }}
    >
      {/* Decorative: screen readers just read the greeting. */}
      {!compact && (
        <span aria-hidden="true" style={{ marginRight: "0.3em" }}>
          {EMOJI[period]}
        </span>
      )}
      {name ? t("greeting.withName", { greeting: text, name }) : text}
    </h1>
  );
}

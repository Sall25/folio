import { useEffect, useState } from "react";
import { Sun, Sunset, Moon, CloudMoon } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

interface GreetingConfig {
  textKey: string;
  icon: LucideIcon;
  color: string;
}

function getGreeting(): GreetingConfig {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12)
    return { textKey: "greeting.morning", icon: Sun, color: "#f59e0b" }; // amber
  if (hour >= 12 && hour < 18)
    return { textKey: "greeting.afternoon", icon: Sunset, color: "#f97316" }; // orange
  if (hour >= 18 && hour < 22)
    return { textKey: "greeting.evening", icon: CloudMoon, color: "#818cf8" }; // indigo
  return { textKey: "greeting.night", icon: Moon, color: "#6366f1" }; // purple
}

interface GreetingProps {
  name?: string;
  className?: string;
  iconSize?: number;
}

export function Greeting({ name, className, iconSize = 28 }: GreetingProps) {
  const { t } = useTranslation();
  const [greeting, setGreeting] = useState(getGreeting);

  useEffect(() => {
    const now = new Date();
    const msUntilNextMinute =
      (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

    const timeout = setTimeout(() => {
      setGreeting(getGreeting());
      const interval = setInterval(() => setGreeting(getGreeting()), 60_000);
      return () => clearInterval(interval);
    }, msUntilNextMinute);

    return () => clearTimeout(timeout);
  }, []);

  const Icon = greeting.icon;
  const text = t(greeting.textKey);

  return (
    <span
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontSize: 28,
        fontFamily: "Inter",
        // color: greeting.color,
      }}
    >
      <Icon
        size={iconSize}
        strokeWidth={1.5}
        fill={greeting.color}
        style={{ color: greeting.color }}
      />
      {name ? t("greeting.withName", { greeting: text, name }) : text}
    </span>
  );
}

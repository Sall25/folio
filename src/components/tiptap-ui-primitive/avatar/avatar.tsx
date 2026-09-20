import { useState, type CSSProperties } from "react";
import type { AvatarSize } from "./types";
import { SIZE } from "./data";
import { getInitials, nameToColor } from "./utils";

interface AvatarProps {
  name?: string | null; // User's display name
  online?: boolean; // Show a green presence dot
  src?: string | null; // Optional image URL
  size?: AvatarSize; // "xs" | "sm" | "md" (default) | "lg" | "xl"
  showTooltip?: boolean; // Show name on hover (default true)
  style?: Partial<CSSProperties>; // Extra inline styles on the wrapper
  className?: string; // Extra class names
}

export function Avatar({
  name = "user",
  online,
  src,
  size = "md",
  showTooltip = true,
  style,
  className,
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const s = SIZE[size] ?? SIZE.md;
  const showImg = !!src && !imgError;
  const initials = getInitials(name ?? undefined);
  const { background, color } = nameToColor(name ?? undefined);

  return (
    <span
      title={showTooltip && name ? name : undefined}
      className={className}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        width: s.box,
        height: s.box,
        borderRadius: "50%",
        overflow: "visible",
        userSelect: "none",
        ...style,
      }}
    >
      {/* Image or initials */}
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          overflow: "hidden",
          background: showImg ? "transparent" : background,
          color: showImg ? undefined : color,
          fontSize: s.font,
          fontWeight: 600,
          fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
          letterSpacing: "0.03em",
          border: "2px solid var(--tt-border-color)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
          boxSizing: "border-box",
        }}
      >
        {showImg ? (
          <img
            src={src ?? undefined}
            alt={name ?? undefined}
            onError={() => setImgError(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          initials || "?"
        )}
      </span>

      {/* Presence dot */}
      {online && (
        <span
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: s.dot,
            height: s.dot,
            borderRadius: "50%",
            background: "#22c55e",
            border: "2px solid white",
            boxSizing: "border-box",
          }}
        />
      )}
    </span>
  );
}

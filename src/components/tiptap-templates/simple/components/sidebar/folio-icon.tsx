import type { SVGProps } from "react";

interface FolioIconProps extends SVGProps<SVGSVGElement> {
  color?: string;
}

export function FolioIcon({
  color = "currentColor",
  ...props
}: FolioIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="3" y="7" width="14" height="14" rx="3" />
      <path d="M7 7V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2" />
    </svg>
  );
}

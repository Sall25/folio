/**
 *
 */

import { memo } from "react";

type SvgProps = React.ComponentPropsWithoutRef<"svg">;

export const FileIcon = memo(({ className, ...props }: SvgProps) => {
  return (
    <svg
      className={className}
      aria-hidden="true"
      role="graphics-symbol"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Page outline with a folded top-right corner */}
      <path d="M4 1.75h5.4L12.25 4.6v9.65H4z" />
      {/* Dog-ear fold */}
      <path d="M9.4 1.75V4.6h2.85" />
      {/* Text lines */}
      <path d="M5.9 8h4.2M5.9 10.4h4.2M5.9 12.8h2.6" />
    </svg>
  );
});

FileIcon.displayName = "FileIcon";

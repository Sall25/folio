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
      {...props}
    >
      <path d="M4.8 3.2a1.2 1.2 0 1 0 2.4 0 1.2 1.2 0 0 0-2.4 0m4 0a1.2 1.2 0 1 0 2.4 0 1.2 1.2 0 0 0-2.4 0m1.2 6a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4M4.8 8a1.2 1.2 0 1 0 2.4 0 1.2 1.2 0 0 0-2.4 0m5.2 6a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4m-5.2-1.2a1.2 1.2 0 1 0 2.4 0 1.2 1.2 0 0 0-2.4 0"></path>
    </svg>
  );
});

FileIcon.displayName = "FileIcon";

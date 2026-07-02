import { memo } from "react";

type SvgProps = React.ComponentPropsWithoutRef<"svg">;

// Solid right-pointing triangle — a filled "disclosure" caret. Deliberately
// heavier than lucide's stroked chevron so it stays legible at small sizes.
// Rotation to the expanded (down) state is handled by the consumer via CSS.
export const TriangleChevronIcon = memo(({ className, ...props }: SvgProps) => {
  return (
    <svg
      width="24"
      height="24"
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M9.53 5.87C8.87 5.4 7.95 5.87 7.95 6.68V17.32C7.95 18.13 8.87 18.6 9.53 18.13L16.98 12.81C17.54 12.41 17.54 11.59 16.98 11.19L9.53 5.87Z"
        fill="currentColor"
      ></path>
    </svg>
  );
});

TriangleChevronIcon.displayName = "TriangleChevronIcon";

import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg">

export const AlignmentIcon = memo(({ className, ...props }: SvgProps) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Top line */}
      <rect x="4" y="6" width="16" height="2" rx="1" />

      {/* Center shorter line */}
      <rect x="7" y="11" width="10" height="2" rx="1" />

      {/* Bottom line */}
      <rect x="4" y="16" width="16" height="2" rx="1" />
    </svg>
  )
})

AlignmentIcon.displayName = "AlignmentIcon"
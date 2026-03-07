import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg">

export const FitToWidthIcon = memo(({ className, ...props }: SvgProps) => {
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
      {/* Container */}
      <rect x="3" y="6" width="18" height="12" rx="2" />

      {/* Arrows expanding left & right */}
      <path d="M9 12H5L7 10V14L5 12H9Z" />
      <path d="M15 12H19L17 10V14L19 12H15Z" />
    </svg>
  )
})

FitToWidthIcon.displayName = "FitToWidthIcon"
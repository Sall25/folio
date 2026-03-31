import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg">

export const TextColorIcon = memo(({ className, ...props }: SvgProps) => {
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
      {/* Letter A */}
      <path d="M12 3L7 21h2l1-3h4l1 3h2l-5-18zm-1.5 12l1.5-5 1.5 5h-3z" />
      {/* underline bar representing color */}
      <rect x="4" y="20" width="16" height="2" />
    </svg>
  )
})

TextColorIcon.displayName = "TextColorIcon"

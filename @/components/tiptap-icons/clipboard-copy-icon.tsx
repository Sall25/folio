import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg">

export const ClipboardCopyIcon = memo(({ className, ...props }: SvgProps) => {
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
      {/* Clipboard body */}
      <rect x="6" y="5" width="12" height="16" rx="2" />

      {/* Clip top */}
      <rect x="9" y="3" width="6" height="4" rx="1" />
    </svg>
  )
})

ClipboardCopyIcon.displayName = "ClipboardCopyIcon"
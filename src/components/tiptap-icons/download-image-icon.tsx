import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg">

export const DownloadImageIcon = memo(({ className, ...props }: SvgProps) => {
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
      {/* Image frame */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5 4C3.89543 4 3 4.89543 3 6V14C3 15.1046 3.89543 16 5 16H8C8.55228 16 9 15.5523 9 15C9 14.4477 8.55228 14 8 14H5V6H19V14H16C15.4477 14 15 14.4477 15 15C15 15.5523 15.4477 16 16 16H19C20.1046 16 21 15.1046 21 14V6C21 4.89543 20.1046 4 19 4H5Z"
      />

      {/* Mountain */}
      <path d="M7 12L9.5 9.5L12 12L14.5 10L17 13H7Z" />

      {/* Sun */}
      <circle cx="9" cy="8" r="1.2" />

      {/* Download arrow */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 13C12.5523 13 13 13.4477 13 14V18.5858L14.2929 17.2929C14.6834 16.9024 15.3166 16.9024 15.7071 17.2929C16.0976 17.6834 16.0976 18.3166 15.7071 18.7071L12.7071 21.7071C12.3166 22.0976 11.6834 22.0976 11.2929 21.7071L8.29289 18.7071C7.90237 18.3166 7.90237 17.6834 8.29289 17.2929C8.68342 16.9024 9.31658 16.9024 9.70711 17.2929L11 18.5858V14C11 13.4477 11.4477 13 12 13Z"
      />
    </svg>
  )
})

DownloadImageIcon.displayName = "DownloadImageIcon"
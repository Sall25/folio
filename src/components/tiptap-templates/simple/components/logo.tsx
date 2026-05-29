import "./logo.scss";

interface LogoProps {
  collapsed: boolean;
}

export function Logo({ collapsed }: LogoProps) {
  return (
    <div className={`logo${collapsed ? " logo--collapsed" : ""}`}>
      <div className="logo__mark" aria-hidden="true">
        <svg viewBox="0 0 68 68" xmlns="http://www.w3.org/2000/svg" role="img">
          <defs>
            <linearGradient id="folioSheen" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#fff" stop-opacity="0.35" />
              <stop offset="45%" stop-color="#fff" stop-opacity="0.06" />
              <stop offset="100%" stop-color="#fff" stop-opacity="0" />
            </linearGradient>
          </defs>

          <rect
            x="0"
            y="0"
            width="68"
            height="68"
            rx="10"
            className="logo__page"
          />
          {/* static sheen — light catching the top-left of the sheet */}
          <rect
            x="0"
            y="0"
            width="68"
            height="68"
            rx="10"
            fill="url(#folioSheen)"
          />
          <path d="M48 0 L68 20 L48 20 Z" className="logo__fold" />
          <rect
            x="15"
            y="25"
            width="29"
            height="5"
            rx="2.5"
            className="logo__line logo__line--1"
          />
          <rect
            x="15"
            y="37"
            width="38"
            height="5"
            rx="2.5"
            className="logo__line logo__line--2"
          />
          <rect
            x="15"
            y="49"
            width="24"
            height="5"
            rx="2.5"
            className="logo__line logo__line--3"
          />
        </svg>
      </div>

      {!collapsed && (
        <div className="logo__wordmark">
          <span className="logo__name">Folio</span>
        </div>
      )}
    </div>
  );
}

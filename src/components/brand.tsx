export function BrandMark({
  size = 34,
  variant = "green",
  className,
}: {
  size?: number;
  variant?: "green" | "cream";
  className?: string;
}) {
  const green = variant === "green" ? "#2E5A3C" : "#F7F1DF";
  const cream = variant === "green" ? "#F7F1DF" : "#2E5A3C";
  const gold = "#E0B974";
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-label="乡课标志"
    >
      <rect width="40" height="40" rx="11" fill={green} />
      <circle cx="29.5" cy="10.5" r="2.8" fill={gold} />
      <path
        d="M9.5 15.2c3.6-1.4 7-1.4 10.5 0v12.2c-3.5-1.4-6.9-1.4-10.5 0V15.2Z"
        fill={cream}
      />
      <path
        d="M20 15.2c3.5-1.4 6.9-1.4 10.5 0v12.2c-3.6-1.4-7-1.4-10.5 0V15.2Z"
        fill={cream}
        opacity="0.82"
      />
      <path d="M20 15.6v11.6" stroke={green} strokeWidth="0.9" />
      <path d="M8 31.6h24" stroke={gold} strokeWidth="1.3" strokeLinecap="round" />
      <path
        d="M11.5 34.4h17"
        stroke={gold}
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.65"
      />
    </svg>
  );
}

export function LogoLockup({ variant = "green" }: { variant?: "green" | "cream" }) {
  const cream = variant === "cream";
  return (
    <div className="brand-row">
      <BrandMark size={36} variant={variant} className="brand-mark" />
      <div>
        <div className="brand-name" style={cream ? { color: "#FBF8EE" } : undefined}>
          乡课
        </div>
        <div className="brand-sub" style={cream ? { color: "#FBF8EE" } : undefined}>
          让村小也能备一堂好课
        </div>
      </div>
    </div>
  );
}

export function TerraceArt({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 250 150"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="197" cy="34" r="17" strokeWidth="1.1" />
      <circle cx="197" cy="34" r="11" strokeWidth="0.7" strokeDasharray="2 4" />
      <path d="M2 92c30-20 50-21 76-8s52 17 79 4 55-15 91 1" strokeWidth="1.1" />
      <path d="M0 106c35-15 62-13 87 0s57 13 85-1 49-10 78 2" strokeWidth="0.9" opacity="0.8" />
      <path d="M0 120c38-11 72-8 99 3s62 8 89-2 40-6 62-1" strokeWidth="0.8" opacity="0.65" />
      <path d="M16 112c14-10 29-12 44-6M78 118c16-9 31-8 47-1M150 112c15-8 30-7 44 0" strokeWidth="0.7" opacity="0.55" />
      <path d="M30 100c12-8 24-9 37-4M120 106c13-7 26-6 39 0" strokeWidth="0.7" opacity="0.5" />
      <path d="M169 95V73h30v22" strokeWidth="1.2" fill="none" />
      <path d="M165 73l19-14 19 14" strokeWidth="1.2" />
      <path d="M181 95V84h7v11" strokeWidth="1" />
      <path d="M171 79h5v6h-5zM191 79h5v6h-5z" strokeWidth="0.8" />
      <path d="M199 59v-9l8 3-8 3" strokeWidth="1" fill="none" />
      <path d="M61 56c4-3 8-3 12 0M78 48c3-2 6-2 9 0M48 45c3-2 6-2 9 0" strokeWidth="0.8" opacity="0.7" />
      <path d="M145 62c3-2 6-2 9 0M158 55c3-2 6-2 9 0" strokeWidth="0.7" opacity="0.5" />
    </svg>
  );
}

export function FieldPattern() {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      stroke="currentColor"
      strokeWidth="0.7"
      aria-hidden="true"
    >
      <path d="M0 32c20-12 38-12 60 0s40 12 60 0" />
      <path d="M0 48c20-12 38-12 60 0s40 12 60 0" />
      <path d="M0 64c20-12 38-12 60 0s40 12 60 0" />
      <path d="M0 80c20-12 38-12 60 0s40 12 60 0" />
      <path d="M0 96c20-12 38-12 60 0s40 12 60 0" />
    </svg>
  );
}
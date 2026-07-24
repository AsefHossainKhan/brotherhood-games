import React from 'react';

interface CardBackProps {
  width?: number;
  height?: number;
  className?: string;
}

export function CardBack({ width = 80, height = 112, className }: CardBackProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 80 112"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Card shadow */}
      <rect
        x="3"
        y="3"
        width="76"
        height="108"
        rx="8"
        ry="8"
        fill="rgba(0,0,0,0.3)"
      />
      
      {/* Card outline */}
      <rect
        x="1"
        y="1"
        width="78"
        height="110"
        rx="8"
        ry="8"
        fill="#1e3a5f"
        stroke="#0f2440"
        strokeWidth="2"
      />

      {/* Inner border */}
      <rect
        x="5"
        y="5"
        width="70"
        height="102"
        rx="5"
        ry="5"
        fill="none"
        stroke="#3b82f6"
        strokeWidth="1"
        opacity="0.4"
      />

      {/* Diamond pattern */}
      <pattern id="cardback-pattern" width="10" height="10" patternUnits="userSpaceOnUse">
        <path d="M5 0L10 5L5 10L0 5Z" fill="#3b82f6" opacity="0.3" />
      </pattern>
      <rect
        x="8"
        y="8"
        width="64"
        height="96"
        rx="3"
        ry="3"
        fill="url(#cardback-pattern)"
      />

      {/* Center diamond - outer */}
      <path
        d="M40 28L56 56L40 84L24 56Z"
        fill="#3b82f6"
        stroke="#60a5fa"
        strokeWidth="1.5"
        opacity="0.9"
      />

      {/* Center diamond - inner */}
      <path
        d="M40 36L50 56L40 76L30 56Z"
        fill="#1e3a5f"
        stroke="#3b82f6"
        strokeWidth="1"
      />

      {/* Center diamond - core */}
      <path
        d="M40 44L46 56L40 68L34 56Z"
        fill="#60a5fa"
        opacity="0.6"
      />

      {/* Corner accents */}
      <circle cx="12" cy="12" r="2" fill="#3b82f6" opacity="0.3" />
      <circle cx="68" cy="12" r="2" fill="#3b82f6" opacity="0.3" />
      <circle cx="12" cy="100" r="2" fill="#3b82f6" opacity="0.3" />
      <circle cx="68" cy="100" r="2" fill="#3b82f6" opacity="0.3" />
    </svg>
  );
}

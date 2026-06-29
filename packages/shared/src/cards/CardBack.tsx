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
        x="6"
        y="6"
        width="68"
        height="100"
        rx="4"
        ry="4"
        fill="none"
        stroke="#2d5a8e"
        strokeWidth="1.5"
      />
      {/* Diamond pattern */}
      <pattern id="cardback-pattern" width="12" height="12" patternUnits="userSpaceOnUse">
        <path d="M6 0L12 6L6 12L0 6Z" fill="#2d5a8e" opacity="0.4" />
      </pattern>
      <rect
        x="10"
        y="10"
        width="60"
        height="92"
        rx="2"
        ry="2"
        fill="url(#cardback-pattern)"
      />
      {/* Center diamond */}
      <path
        d="M40 30L55 56L40 82L25 56Z"
        fill="#3b82f6"
        stroke="#60a5fa"
        strokeWidth="1"
      />
      <path
        d="M40 38L50 56L40 74L30 56Z"
        fill="#1e3a5f"
        stroke="#3b82f6"
        strokeWidth="0.5"
      />
    </svg>
  );
}

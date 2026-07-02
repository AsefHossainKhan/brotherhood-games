import React from 'react';
import type { Suit } from '../types/card';

interface SuitSVGProps {
  suit: Suit;
  size?: number;
  color?: string;
}

const suitColors: Record<Suit, string> = {
  hearts: '#dc2626',
  diamonds: '#dc2626',
  clubs: '#1a1a2e',
  spades: '#1a1a2e',
};

/**
 * Proper playing card suit icons built with SVG primitives.
 * viewBox 0 0 100 100 for consistent scaling.
 */
function HeartSVG({ fill }: { fill: string }) {
  return (
    <svg viewBox="0 0 100 100" fill={fill}>
      <path
        d="M50 90 C25 65, 2 50, 2 30 C2 14, 14 2, 30 2 C40 2, 48 8, 50 18 C52 8, 60 2, 70 2 C86 2, 98 14, 98 30 C98 50, 75 65, 50 90Z"
        fillRule="evenodd"
      />
    </svg>
  );
}

function DiamondSVG({ fill }: { fill: string }) {
  return (
    <svg viewBox="0 0 100 100" fill={fill}>
      <path d="M50 4 L94 50 L50 96 L6 50 Z" />
    </svg>
  );
}

function ClubSVG({ fill }: { fill: string }) {
  return (
    <svg viewBox="0 0 100 100" fill={fill}>
      {/* Stem */}
      <rect x="43" y="56" width="14" height="30" rx="2" />
      {/* Stem base */}
      <rect x="36" y="82" width="28" height="8" rx="3" />
      {/* Fill center gap between the three circles */}
      <circle cx="50" cy="43" r="14" />
      {/* Three lobes */}
      <circle cx="50" cy="24" r="20" />
      <circle cx="28" cy="52" r="20" />
      <circle cx="72" cy="52" r="20" />
    </svg>
  );
}

function SpadeSVG({ fill }: { fill: string }) {
  return (
    <svg viewBox="0 0 100 100" fill={fill}>
      {/* Spade body (inverted heart) */}
      <path d="M50 4 C50 4, 96 50, 96 66 C96 82, 84 92, 70 84 C60 78, 54 68, 54 60 L54 88 L46 88 L46 60 C46 68, 40 78, 30 84 C16 92, 4 82, 4 66 C4 50, 50 4, 50 4Z" />
      {/* Stem base */}
      <rect x="36" y="84" width="28" height="8" rx="3" />
    </svg>
  );
}

/**
 * Raw SVG group for each suit — embeddable directly inside any <svg>.
 * All shapes use a 0 0 100 100 coordinate space.
 */
export function SuitIcon({ suit, fill }: { suit: Suit; fill: string }) {
  switch (suit) {
    case 'hearts':
      return (
        <g fill={fill}>
          <path
            d="M50 90 C25 65, 2 50, 2 30 C2 14, 14 2, 30 2 C40 2, 48 8, 50 18 C52 8, 60 2, 70 2 C86 2, 98 14, 98 30 C98 50, 75 65, 50 90Z"
            fillRule="evenodd"
          />
        </g>
      );
    case 'diamonds':
      return (
        <g fill={fill}>
          <path d="M50 4 L94 50 L50 96 L6 50 Z" />
        </g>
      );
    case 'clubs':
      return (
        <g fill={fill}>
          <rect x="43" y="56" width="14" height="30" rx="2" />
          <rect x="36" y="82" width="28" height="8" rx="3" />
          <circle cx="50" cy="43" r="14" />
          <circle cx="50" cy="24" r="20" />
          <circle cx="28" cy="52" r="20" />
          <circle cx="72" cy="52" r="20" />
        </g>
      );
    case 'spades':
      return (
        <g fill={fill}>
          <path d="M50 4 C50 4, 96 50, 96 66 C96 82, 84 92, 70 84 C60 78, 54 68, 54 60 L54 88 L46 88 L46 60 C46 68, 40 78, 30 84 C16 92, 4 82, 4 66 C4 50, 50 4, 50 4Z" />
          <rect x="36" y="84" width="28" height="8" rx="3" />
        </g>
      );
  }
}

const suitComponents: Record<Suit, React.ComponentType<{ fill: string }>> = {
  hearts: HeartSVG,
  diamonds: DiamondSVG,
  clubs: ClubSVG,
  spades: SpadeSVG,
};

export function SuitSVG({ suit, size = 24, color }: SuitSVGProps) {
  const fill = color ?? suitColors[suit];
  const Component = suitComponents[suit];
  return (
    <div style={{ width: size, height: size, lineHeight: 0 }}>
      <Component fill={fill} />
    </div>
  );
}

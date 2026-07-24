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
  clubs: '#1e293b',
  spades: '#1e293b',
};

/**
 * Classic playing card suit icons - refined for better visual quality.
 * viewBox 0 0 100 100 for consistent scaling.
 */
function HeartSVG({ fill }: { fill: string }) {
  return (
    <svg viewBox="0 0 100 100" fill={fill}>
      <path
        d="M50 88 C20 65, 0 48, 0 28 C0 12, 12 0, 28 0 C38 0, 46 6, 50 16 C54 6, 62 0, 72 0 C88 0, 100 12, 100 28 C100 48, 80 65, 50 88Z"
        fillRule="evenodd"
      />
    </svg>
  );
}

function DiamondSVG({ fill }: { fill: string }) {
  return (
    <svg viewBox="0 0 100 100" fill={fill}>
      <path d="M50 2 L98 50 L50 98 L2 50 Z" />
    </svg>
  );
}

function ClubSVG({ fill }: { fill: string }) {
  return (
    <svg viewBox="0 0 100 100" fill={fill}>
      {/* Stem */}
      <rect x="44" y="58" width="12" height="28" rx="2" />
      {/* Stem base */}
      <rect x="34" y="82" width="32" height="8" rx="4" />
      {/* Three lobes - classic club shape */}
      <circle cx="50" cy="22" r="22" />
      <circle cx="26" cy="50" r="22" />
      <circle cx="74" cy="50" r="22" />
      {/* Fill center */}
      <circle cx="50" cy="42" r="12" />
    </svg>
  );
}

function SpadeSVG({ fill }: { fill: string }) {
  return (
    <svg viewBox="0 0 100 100" fill={fill}>
      {/* Spade body - classic inverted heart with pointed tip */}
      <path d="M50 2 C50 2, 100 48, 100 64 C100 82, 86 94, 72 86 C62 80, 56 70, 54 62 L54 92 L46 92 L46 62 C44 70, 38 80, 28 86 C14 94, 0 82, 0 64 C0 48, 50 2, 50 2Z" />
      {/* Stem base */}
      <rect x="34" y="88" width="32" height="8" rx="4" />
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
            d="M50 88 C20 65, 0 48, 0 28 C0 12, 12 0, 28 0 C38 0, 46 6, 50 16 C54 6, 62 0, 72 0 C88 0, 100 12, 100 28 C100 48, 80 65, 50 88Z"
            fillRule="evenodd"
          />
        </g>
      );
    case 'diamonds':
      return (
        <g fill={fill}>
          <path d="M50 2 L98 50 L50 98 L2 50 Z" />
        </g>
      );
    case 'clubs':
      return (
        <g fill={fill}>
          <rect x="44" y="58" width="12" height="28" rx="2" />
          <rect x="34" y="82" width="32" height="8" rx="4" />
          <circle cx="50" cy="22" r="22" />
          <circle cx="26" cy="50" r="22" />
          <circle cx="74" cy="50" r="22" />
          <circle cx="50" cy="42" r="12" />
        </g>
      );
    case 'spades':
      return (
        <g fill={fill}>
          <path d="M50 2 C50 2, 100 48, 100 64 C100 82, 86 94, 72 86 C62 80, 56 70, 54 62 L54 92 L46 92 L46 62 C44 70, 38 80, 28 86 C14 94, 0 82, 0 64 C0 48, 50 2, 50 2Z" />
          <rect x="34" y="88" width="32" height="8" rx="4" />
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

import React from 'react';
import type { Suit } from '../types/card';

interface SuitSVGProps {
  suit: Suit;
  size?: number;
  color?: string;
}

const suitPaths: Record<Suit, string> = {
  hearts:
    'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
  diamonds:
    'M12 2L2 12l10 10 10-10L12 2z',
  clubs:
    'M12 2C9.24 2 7 4.24 7 7c0 1.52.68 2.87 1.75 3.79C7.56 11.63 6 13.47 6 15.5 6 18.26 8.24 20 11 20h2c2.76 0 5-1.74 5-4.5 0-2.03-1.56-3.87-2.75-4.71C16.32 9.87 17 8.52 17 7c0-2.76-2.24-5-5-5z',
  spades:
    'M12 2C9 7 4 10 4 14c0 3.31 2.69 6 6 6h4c3.31 0 6-2.69 6-6 0-4-5-7-8-12zm-1 18h2v3h-1v-1h-1v1h-1v-3z',
};

const suitColors: Record<Suit, string> = {
  hearts: '#dc2626',
  diamonds: '#dc2626',
  clubs: '#1f2937',
  spades: '#1f2937',
};

export function SuitSVG({ suit, size = 24, color }: SuitSVGProps) {
  const fill = color ?? suitColors[suit];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d={suitPaths[suit]} />
    </svg>
  );
}

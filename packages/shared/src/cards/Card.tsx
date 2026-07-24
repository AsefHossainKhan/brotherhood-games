import React from 'react';
import type { Card } from '../types/card';
import { SuitIcon } from './SuitSVG';

interface CardComponentProps {
  card: Card;
  width?: number;
  height?: number;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

const isRedSuit = (suit: string) => suit === 'hearts' || suit === 'diamonds';

export function CardComponent({
  card,
  width = 80,
  height = 112,
  selected = false,
  disabled = false,
  onClick,
  className = '',
}: CardComponentProps) {
  const { suit, rank } = card;
  const color = isRedSuit(suit) ? '#dc2626' : '#1e293b';

  return (
    <div
      className={`${className} ${onClick ? 'cursor-pointer' : ''} ${
        selected ? '-translate-y-3' : ''
      } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      onClick={disabled ? undefined : onClick}
      style={{
        width,
        height,
        transition: 'transform 0.2s ease, filter 0.2s ease',
        filter: selected
          ? 'drop-shadow(0 8px 16px rgba(0,0,0,0.5))'
          : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
      }}
    >
      <svg
        width={width}
        height={height}
        viewBox="0 0 80 112"
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
          fill="rgba(0,0,0,0.2)"
        />
        
        {/* Card body */}
        <rect
          x="1"
          y="1"
          width="78"
          height="110"
          rx="8"
          ry="8"
          fill="white"
          stroke={selected ? '#3b82f6' : '#d1d5db'}
          strokeWidth={selected ? 2.5 : 1}
        />

        {/* Subtle inner border */}
        <rect
          x="4"
          y="4"
          width="72"
          height="104"
          rx="5"
          ry="5"
          fill="none"
          stroke="rgba(0,0,0,0.05)"
          strokeWidth="0.5"
        />

        {/* Top-left rank & suit */}
        <text
          x="11"
          y="18"
          fill={color}
          fontSize={rank === '10' ? 13 : 15}
          fontWeight="700"
          fontFamily="'Georgia', 'Times New Roman', serif"
          textAnchor="middle"
        >
          {rank}
        </text>
        <g transform="translate(4, 20) scale(0.14)">
          <SuitIcon suit={suit} fill={color} />
        </g>

        {/* Center suit (large) */}
        <g transform="translate(24, 38) scale(0.38)">
          <SuitIcon suit={suit} fill={color} />
        </g>

        {/* Bottom-right rank & suit (rotated 180°) */}
        <g transform="rotate(180, 40, 56)">
          <text
            x="11"
            y="18"
            fill={color}
            fontSize={rank === '10' ? 13 : 15}
            fontWeight="700"
            fontFamily="'Georgia', 'Times New Roman', serif"
            textAnchor="middle"
          >
            {rank}
          </text>
          <g transform="translate(4, 20) scale(0.14)">
            <SuitIcon suit={suit} fill={color} />
          </g>
        </g>
      </svg>
    </div>
  );
}

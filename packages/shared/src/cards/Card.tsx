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
  const color = isRedSuit(suit) ? '#dc2626' : '#1a1a2e';

  return (
    <div
      className={`${className} ${onClick ? 'cursor-pointer' : ''} ${
        selected ? '-translate-y-3' : ''
      } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      onClick={disabled ? undefined : onClick}
      style={{
        width,
        height,
        transition: 'transform 0.15s ease',
        filter: selected ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.35))' : 'drop-shadow(0 1px 3px rgba(0,0,0,0.15))',
      }}
    >
      <svg
        width={width}
        height={height}
        viewBox="0 0 80 112"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Card body */}
        <rect
          x="1"
          y="1"
          width="78"
          height="110"
          rx="6"
          ry="6"
          fill="white"
          stroke={selected ? '#3b82f6' : '#e5e7eb'}
          strokeWidth={selected ? 2 : 1}
        />

        {/* Top-left rank & suit */}
        <text
          x="10"
          y="15"
          fill={color}
          fontSize={rank === '10' ? 12 : 14}
          fontWeight="700"
          fontFamily="'Georgia', 'Times New Roman', serif"
          textAnchor="middle"
        >
          {rank}
        </text>
        <g transform="translate(3, 17) scale(0.14)">
          <SuitIcon suit={suit} fill={color} />
        </g>

        {/* Center suit (large) */}
        <g transform="translate(22, 34) scale(0.36)">
          <SuitIcon suit={suit} fill={color} />
        </g>

        {/* Bottom-right rank & suit (rotated 180°) */}
        <g transform="rotate(180, 40, 56)">
          <text
            x="10"
            y="15"
            fill={color}
            fontSize={rank === '10' ? 12 : 14}
            fontWeight="700"
            fontFamily="'Georgia', 'Times New Roman', serif"
            textAnchor="middle"
          >
            {rank}
          </text>
          <g transform="translate(3, 17) scale(0.14)">
            <SuitIcon suit={suit} fill={color} />
          </g>
        </g>
      </svg>
    </div>
  );
}

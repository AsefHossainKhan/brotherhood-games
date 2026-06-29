import React from 'react';
import type { Card } from '../types/card';
import { SuitSVG } from './SuitSVG';

interface CardComponentProps {
  card: Card;
  width?: number;
  height?: number;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

const rankPositions: Record<string, { x: number; y: number; fontSize: number }> = {
  'J': { x: 8, y: 18, fontSize: 16 },
  '9': { x: 8, y: 18, fontSize: 16 },
  'A': { x: 8, y: 18, fontSize: 16 },
  '10': { x: 5, y: 18, fontSize: 15 },
  'K': { x: 8, y: 18, fontSize: 16 },
  'Q': { x: 8, y: 18, fontSize: 16 },
  '8': { x: 8, y: 18, fontSize: 16 },
  '7': { x: 8, y: 18, fontSize: 16 },
  '6': { x: 8, y: 18, fontSize: 16 },
  '5': { x: 8, y: 18, fontSize: 16 },
  '4': { x: 8, y: 18, fontSize: 16 },
  '3': { x: 8, y: 18, fontSize: 16 },
  '2': { x: 8, y: 18, fontSize: 16 },
};

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
  const color = isRedSuit(suit) ? '#dc2626' : '#1f2937';
  const pos = rankPositions[rank] ?? { x: 8, y: 18, fontSize: 16 };
  const scale = width / 80;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 80 112"
      className={`${className} ${onClick ? 'cursor-pointer' : ''} ${
        selected ? '-translate-y-3' : ''
      } ${disabled ? 'opacity-50' : ''}`}
      onClick={disabled ? undefined : onClick}
      style={{
        transition: 'transform 0.15s ease',
        filter: selected ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' : 'none',
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
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
        strokeWidth={selected ? 2.5 : 1.5}
      />

      {/* Top-left rank */}
      <text
        x={pos.x}
        y={pos.y}
        fill={color}
        fontSize={pos.fontSize * scale}
        fontWeight="bold"
        fontFamily="system-ui, sans-serif"
      >
        {rank}
      </text>

      {/* Top-left suit */}
      <foreignObject x={4} y={20} width={20} height={20}>
        <SuitSVG suit={suit} size={16 * scale} />
      </foreignObject>

      {/* Center suit (large) */}
      <foreignObject x={24} y={36} width={32} height={40}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
          }}
        >
          <SuitSVG suit={suit} size={32 * scale} />
        </div>
      </foreignObject>

      {/* Bottom-right rank (rotated) */}
      <g transform="rotate(180, 40, 56)">
        <text
          x={pos.x}
          y={pos.y}
          fill={color}
          fontSize={pos.fontSize * scale}
          fontWeight="bold"
          fontFamily="system-ui, sans-serif"
        >
          {rank}
        </text>
        <foreignObject x={4} y={20} width={20} height={20}>
          <SuitSVG suit={suit} size={16 * scale} />
        </foreignObject>
      </g>
    </svg>
  );
}

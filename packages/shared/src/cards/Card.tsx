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
  const scale = width / 80;

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

        {/* Top-left rank */}
        <text
          x="8"
          y="17"
          fill={color}
          fontSize={rank === '10' ? 13 : 14}
          fontWeight="700"
          fontFamily="'Georgia', 'Times New Roman', serif"
          textAnchor="start"
        >
          {rank}
        </text>

        {/* Top-left suit icon */}
        <foreignObject x="4" y="19" width="16" height="16">
          <div style={{ width: 12 * scale, height: 12 * scale }}>
            <SuitSVG suit={suit} size={12 * scale} />
          </div>
        </foreignObject>

        {/* Center suit (large) */}
        <foreignObject x="20" y="32" width="40" height="48">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
            }}
          >
            <SuitSVG suit={suit} size={36 * scale} />
          </div>
        </foreignObject>

        {/* Bottom-right (rotated 180°) */}
        <g transform="rotate(180, 40, 56)">
          <text
            x="8"
            y="17"
            fill={color}
            fontSize={rank === '10' ? 13 : 14}
            fontWeight="700"
            fontFamily="'Georgia', 'Times New Roman', serif"
            textAnchor="start"
          >
            {rank}
          </text>
          <foreignObject x="4" y="19" width="16" height="16">
            <div style={{ width: 12 * scale, height: 12 * scale }}>
              <SuitSVG suit={suit} size={12 * scale} />
            </div>
          </foreignObject>
        </g>
      </svg>
    </div>
  );
}

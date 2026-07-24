'use client';

import { useSocketStore } from '@/stores/socketStore';
import { CardBack } from '@brotherhood/shared/cards';

interface PlayerSeatProps {
  player: {
    id: string;
    username: string;
    seat: number;
    team: number;
    isDealer: boolean;
    isDeclarer: boolean;
    isConnected: boolean;
    handCount: number;
  };
  position: 'top' | 'left' | 'right';
}

export function PlayerSeat({ player, position }: PlayerSeatProps) {
  const guestId = useSocketStore((s) => s.guestId);
  const isMe = player.id === guestId;

  const cardCount = player.handCount;
  const maxVisible = Math.min(cardCount, 8);
  const cardBackWidth = 32;
  const maxFanWidth = 120;
  const overlap = cardCount > 1
    ? Math.min(14, (maxFanWidth - cardBackWidth) / (cardCount - 1))
    : 0;

  const isHorizontal = position === 'top';
  // For right-side player, render cards first (to the left), then player info
  const cardsFirst = position === 'right';

  const playerInfo = (
    <div
      className={`flex ${isHorizontal ? 'flex-row' : 'flex-col'} items-center gap-1.5 rounded-lg px-2 py-1.5 ${
        player.isDeclarer
          ? 'border border-yellow-500/50 bg-yellow-500/10'
          : player.isConnected
          ? 'border border-white/10 bg-black/20'
          : 'border border-red-800/50 bg-red-900/20'
      }`}
    >
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${
          player.isConnected ? 'bg-white/10' : 'bg-red-900/30'
        }`}
      >
        {player.isConnected ? '👤' : '💤'}
      </div>

      <div className="text-center">
        <div className="flex items-center justify-center gap-1">
          <span className="text-xs font-medium text-white/90">
            {isMe ? 'You' : player.username}
          </span>
          {player.isDealer && (
            <span className="rounded bg-blue-600 px-1 py-0.5 text-[10px] font-bold text-white">D</span>
          )}
          {player.isDeclarer && (
            <span className="rounded bg-yellow-500 px-1 py-0.5 text-[10px] font-bold text-black">★</span>
          )}
        </div>
        <span
          className={`rounded px-1 py-0.5 text-[10px] font-medium ${
            player.team === 0 ? 'bg-blue-600/80 text-blue-100' : 'bg-red-600/80 text-red-100'
          }`}
        >
          {player.team === 0 ? 'A' : 'B'}
        </span>
      </div>
    </div>
  );

  const cardBacks = (
    <div
      className="relative flex items-center"
      style={{
        width: isHorizontal ? `${cardBackWidth + overlap * Math.max(maxVisible - 1, 0)}px` : undefined,
        height: '52px',
      }}
    >
      {Array.from({ length: maxVisible }).map((_, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: `${i * overlap}px`,
            zIndex: i,
            transform: `rotate(${(i - (maxVisible - 1) / 2) * (isHorizontal ? 3 : 2)}deg)`,
          }}
        >
          <CardBack width={cardBackWidth} height={cardBackWidth * 1.4} />
        </div>
      ))}
    </div>
  );

  return (
    <div
      className={`flex ${isHorizontal ? 'flex-col items-center' : 'flex-row items-center'} gap-2 ${
        player.isDeclarer
          ? 'drop-shadow-[0_0_12px_rgba(234,179,8,0.4)]'
          : ''
      }`}
    >
      {cardsFirst ? (
        <>
          {cardBacks}
          {playerInfo}
          <span className="text-[10px] text-white/40">{cardCount} cards</span>
        </>
      ) : (
        <>
          {playerInfo}
          {cardBacks}
          <span className="text-[10px] text-white/40">{cardCount} cards</span>
        </>
      )}
    </div>
  );
}

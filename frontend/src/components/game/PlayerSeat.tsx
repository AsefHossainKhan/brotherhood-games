'use client';

import { useSocketStore } from '@/stores/socketStore';
import { useUiScale } from '@/hooks/useUiScale';
import { CardBack } from '@brotherhood/shared/cards';
import { motion } from 'framer-motion';

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
  isCurrentTurn?: boolean;
}

export function PlayerSeat({ player, position, isCurrentTurn = false }: PlayerSeatProps) {
  const guestId = useSocketStore((s) => s.guestId);
  const isMe = player.id === guestId;
  const scale = useUiScale();

  const cardCount = player.handCount;
  const maxVisible = Math.min(cardCount, 8);
  const cardBackWidth = Math.round(30 * scale);
  const cardBackHeight = Math.round(cardBackWidth * 1.4);

  const isHorizontal = position === 'top';
  // Top seat fans left-to-right; side seats (left/right) fan top-to-bottom.
  const fanExtent = Math.round((isHorizontal ? 96 : 132) * scale);
  const cardExtent = isHorizontal ? cardBackWidth : cardBackHeight;
  const overlap =
    cardCount > 1
      ? Math.min(
          Math.round((isHorizontal ? 14 : 16) * scale),
          (fanExtent - cardExtent) / (cardCount - 1),
        )
      : 0;

  // Cards are placed on the side that faces AWAY from the centre table so the
  // fan never droops over the play slots or the player label:
  //  - top seat  -> cards above the label (fan upward)
  //  - right seat -> cards to the left of the label
  //  - left seat  -> label first, then cards
  const cardsFirst = position === 'right' || position === 'top';

  const playerInfo = (
    <div
      className={`relative flex ${isHorizontal ? 'flex-row' : 'flex-col'} items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors ${
        isCurrentTurn
          ? 'border-2 border-green-400/80 bg-green-500/15'
          : player.isDeclarer
          ? 'border border-yellow-500/50 bg-yellow-500/10'
          : player.isConnected
          ? 'border border-white/10 bg-black/20'
          : 'border border-red-800/50 bg-red-900/20'
      }`}
    >
      {isCurrentTurn && (
        <motion.span
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-green-500 px-1.5 py-0.5 text-[9px] font-bold text-white shadow"
        >
          ● TURN
        </motion.span>
      )}
      <div
        className={`relative flex h-8 w-8 items-center justify-center rounded-full text-sm ${
          player.isConnected ? 'bg-white/10' : 'bg-red-900/30'
        }`}
      >
        {player.isConnected ? '👤' : '💤'}
        <span className="absolute -bottom-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-black/70 px-1 text-[9px] font-bold text-white/80 ring-1 ring-white/15">
          {cardCount}
        </span>
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
      className="relative flex items-center justify-center"
      style={
        isHorizontal
          ? {
              width: `${cardBackWidth + overlap * Math.max(maxVisible - 1, 0)}px`,
              height: `${cardBackHeight + 6}px`,
            }
          : {
              width: `${cardBackWidth + 8}px`,
              height: `${cardBackHeight + overlap * Math.max(maxVisible - 1, 0)}px`,
            }
      }
    >
      {Array.from({ length: maxVisible }).map((_, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: isHorizontal ? `${i * overlap}px` : '50%',
            top: isHorizontal ? '50%' : `${i * overlap}px`,
            zIndex: i,
            transform: `translate(${isHorizontal ? '0' : '-50%'}, ${isHorizontal ? '-50%' : '0'}) rotate(${(i - (maxVisible - 1) / 2) * (isHorizontal ? 3 : 2)}deg)`,
          }}
        >
          <CardBack width={cardBackWidth} height={cardBackHeight} />
        </div>
      ))}
    </div>
  );

  return (
    <div
      className={`flex ${isHorizontal ? 'flex-col items-center' : 'flex-row items-center'} gap-2 transition-all ${
        isCurrentTurn
          ? 'drop-shadow-[0_0_14px_rgba(74,222,128,0.5)]'
          : player.isDeclarer
          ? 'drop-shadow-[0_0_12px_rgba(234,179,8,0.4)]'
          : ''
      }`}
    >
      {cardsFirst ? (
        <>
          {cardBacks}
          {playerInfo}
        </>
      ) : (
        <>
          {playerInfo}
          {cardBacks}
        </>
      )}
    </div>
  );
}

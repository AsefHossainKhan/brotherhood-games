'use client';

interface PlayerSeatProps {
  player: {
    id: string;
    seat: number;
    team: number;
    isDealer: boolean;
    isDeclarer: boolean;
    isConnected: boolean;
    handCount: number;
  };
}

export function PlayerSeat({ player }: PlayerSeatProps) {
  return (
    <div
      className={`flex flex-col items-center gap-1 rounded-lg border px-4 py-3 ${
        player.isDeclarer
          ? 'border-yellow-500 bg-yellow-500/10'
          : player.isConnected
          ? 'border-gray-700 bg-gray-800/50'
          : 'border-red-800 bg-red-900/20'
      }`}
    >
      {/* Avatar placeholder */}
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700 text-lg">
        {player.isConnected ? '👤' : '💤'}
      </div>

      {/* Name */}
      <span className="text-sm font-medium text-white">
        Seat {player.seat + 1}
      </span>

      {/* Badges */}
      <div className="flex gap-1">
        {player.isDealer && (
          <span className="rounded bg-blue-600 px-1.5 py-0.5 text-xs text-white">D</span>
        )}
        {player.isDeclarer && (
          <span className="rounded bg-yellow-600 px-1.5 py-0.5 text-xs text-white">★</span>
        )}
      </div>

      {/* Card count */}
      <span className="text-xs text-gray-500">{player.handCount} cards</span>
    </div>
  );
}

'use client';

import { useRoom } from '@/hooks/useRoom';
import { useSocket } from '@/hooks/useSocket';
import { useSocketStore } from '@/stores/socketStore';

export function Lobby() {
  const {
    roomCode,
    players,
    spectators,
    isHost,
    mySeat,
    startGame,
    leaveRoom,
    changeTeam,
    changeSeat,
  } = useRoom();

  const guestId = useSocketStore((s) => s.guestId);

  useSocket();

  const playerCount = players.length;
  const canStart = playerCount === 4 && isHost;

  // Group players by team
  const teamA = players.filter((p) => p.team === 0);
  const teamB = players.filter((p) => p.team === 1);

  const myPlayer = players.find((p) => p.userId === guestId);
  const myTeam = myPlayer?.team ?? null;

  const handleSwitchTeam = () => {
    if (myTeam === null) return;
    changeTeam(myTeam === 0 ? 1 : 0);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Room header */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">Waiting Room</h2>
          <div className="mt-3 flex items-center justify-center gap-3">
            <span data-testid="room-code" className="rounded-lg bg-gray-800 px-4 py-2 font-mono text-2xl font-bold tracking-widest text-green-400">
              {roomCode}
            </span>
            <button
              onClick={() => navigator.clipboard.writeText(roomCode ?? '')}
              className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-400 hover:bg-gray-800 transition-colors"
            >
              Copy
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Share this code with your friends
          </p>
        </div>

        {/* Teams */}
        <div className="grid grid-cols-2 gap-4">
          {/* Team A */}
          <div className={`rounded-lg border p-4 ${
            myTeam === 0 ? 'border-blue-500 bg-blue-950/30' : 'border-gray-800 bg-gray-900/50'
          }`}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-blue-400">Team A</h3>
              <span className="text-xs text-gray-500">{teamA.length}/2</span>
            </div>
            <div className="space-y-2">
              {teamA.map((player) => (
                <div
                  key={player.userId}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
                    player.userId === guestId
                      ? 'bg-blue-900/50 border border-blue-700'
                      : 'bg-gray-800/50 border border-gray-700'
                  }`}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-700 text-xs font-bold text-gray-300">
                    {(player.seat ?? 0) + 1}
                  </span>
                  <span className={`flex-1 text-sm ${
                    player.userId === guestId ? 'text-blue-300 font-medium' : 'text-white'
                  }`}>
                    {player.username}
                    {player.userId === guestId && ' (you)'}
                  </span>
                  {player.userId !== guestId && !player.isConnected && (
                    <span className="text-xs text-red-400">offline</span>
                  )}
                </div>
              ))}
              {teamA.length < 2 && (
                <div className="flex h-10 items-center justify-center rounded-lg border border-dashed border-gray-700 text-xs text-gray-600">
                  Empty seat
                </div>
              )}
            </div>
          </div>

          {/* Team B */}
          <div className={`rounded-lg border p-4 ${
            myTeam === 1 ? 'border-red-500 bg-red-950/30' : 'border-gray-800 bg-gray-900/50'
          }`}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-red-400">Team B</h3>
              <span className="text-xs text-gray-500">{teamB.length}/2</span>
            </div>
            <div className="space-y-2">
              {teamB.map((player) => (
                <div
                  key={player.userId}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
                    player.userId === guestId
                      ? 'bg-red-900/50 border border-red-700'
                      : 'bg-gray-800/50 border border-gray-700'
                  }`}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-700 text-xs font-bold text-gray-300">
                    {(player.seat ?? 0) + 1}
                  </span>
                  <span className={`flex-1 text-sm ${
                    player.userId === guestId ? 'text-red-300 font-medium' : 'text-white'
                  }`}>
                    {player.username}
                    {player.userId === guestId && ' (you)'}
                  </span>
                  {player.userId !== guestId && !player.isConnected && (
                    <span className="text-xs text-red-400">offline</span>
                  )}
                </div>
              ))}
              {teamB.length < 2 && (
                <div className="flex h-10 items-center justify-center rounded-lg border border-dashed border-gray-700 text-xs text-gray-600">
                  Empty seat
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Team switch button */}
        {myPlayer && (
          <div className="flex justify-center">
            <button
              onClick={handleSwitchTeam}
              data-testid="switch-team-btn"
              className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
            >
              Switch to {myTeam === 0 ? 'Team B' : 'Team A'}
            </button>
          </div>
        )}

        {/* Spectators */}
        {spectators.length > 0 && (
          <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
            <h3 className="mb-2 text-sm font-medium text-gray-400">
              Spectators ({spectators.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {spectators.map((s) => (
                <span
                  key={s.id}
                  className="rounded-full bg-gray-800 px-3 py-1 text-sm text-gray-400"
                >
                  👁 {s.username}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={leaveRoom}
            data-testid="leave-room-btn"
            className="flex-1 rounded-lg border border-gray-700 px-4 py-3 text-gray-400 hover:bg-gray-800 transition-colors"
          >
            Leave
          </button>
          {isHost && (
            <button
              onClick={startGame}
              data-testid="start-game-btn"
              disabled={!canStart}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {canStart ? 'Start Game' : `Need ${4 - playerCount} more`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

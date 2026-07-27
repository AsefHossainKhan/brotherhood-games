"use client";

import { useRoom } from "@/hooks/useRoom";
import { useSocket } from "@/hooks/useSocket";
import { useSocketStore } from "@/stores/socketStore";
import { Button } from "@/components/common/Button";
import { motion } from "framer-motion";

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
    addBot,
    removeBot,
  } = useRoom();

  const guestId = useSocketStore((s) => s.guestId);
  const allowBots = useSocketStore((s) => s.allowBots);

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
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{
        background:
          "radial-gradient(ellipse at 50% 50%,#2d5a27 0%,#1e4a1a 40%,#153812 70%,#0d2a0a 100%)",
      }}
    >
      <div className="w-full max-w-2xl space-y-6">
        {/* Room header */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">Waiting Room</h2>
          <div className="mt-3 flex items-center justify-center gap-3">
            <span
              data-testid="room-code"
              className="rounded-xl border border-white/20 bg-black/40 px-5 py-2.5 font-mono text-2xl font-bold tracking-widest text-green-400 backdrop-blur-sm"
            >
              {roomCode}
            </span>
            <Button
              onClick={() => navigator.clipboard.writeText(roomCode ?? "")}
              variant="outline"
              size="sm"
            >
              Copy
            </Button>
          </div>
          <p className="mt-2 text-sm text-white/40">
            Share this code with your friends
          </p>
        </div>

        {/* Teams */}
        <div className="grid grid-cols-2 gap-4">
          {/* Team A */}
          <div
            className={`rounded-lg border p-4 ${
              myTeam === 0
                ? "border-blue-500 bg-blue-950/30"
                : "border-white/10 bg-black/30"
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-blue-400">Team A</h3>
              <span className="text-xs text-white/40">{teamA.length}/2</span>
            </div>
            <div className="space-y-2">
              {teamA.map((player) => (
                <div
                  key={player.userId}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
                    player.userId === guestId
                      ? "bg-blue-900/50 border border-blue-700"
                      : "bg-white/5 border border-white/20"
                  }`}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white/80">
                    {(player.seat ?? 0) + 1}
                  </span>
                  <span
                    className={`flex-1 text-sm ${
                      player.userId === guestId
                        ? "text-blue-300 font-medium"
                        : "text-white"
                    }`}
                  >
                    {player.username}
                    {player.userId === guestId && " (you)"}
                  </span>
                  {player.isBot && (
                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/60">
                      🤖 BOT
                    </span>
                  )}
                  {isHost && player.isBot && (
                    <button
                      onClick={() => removeBot(player.userId)}
                      aria-label={`Remove ${player.username}`}
                      className="cursor-pointer text-white/40 transition-colors hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
                    >
                      ✕
                    </button>
                  )}
                  {player.userId !== guestId && !player.isConnected && (
                    <span className="text-xs text-red-400">offline</span>
                  )}
                </div>
              ))}
              {teamA.length < 2 && (
                <div className="flex h-10 items-center justify-center rounded-lg border border-dashed border-white/20 text-xs text-white/20">
                  Empty seat
                </div>
              )}
            </div>
          </div>

          {/* Team B */}
          <div
            className={`rounded-lg border p-4 ${
              myTeam === 1
                ? "border-red-500 bg-red-950/30"
                : "border-white/10 bg-black/30"
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-red-400">Team B</h3>
              <span className="text-xs text-white/40">{teamB.length}/2</span>
            </div>
            <div className="space-y-2">
              {teamB.map((player) => (
                <div
                  key={player.userId}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
                    player.userId === guestId
                      ? "bg-red-900/50 border border-red-700"
                      : "bg-white/5 border border-white/20"
                  }`}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white/80">
                    {(player.seat ?? 0) + 1}
                  </span>
                  <span
                    className={`flex-1 text-sm ${
                      player.userId === guestId
                        ? "text-red-300 font-medium"
                        : "text-white"
                    }`}
                  >
                    {player.username}
                    {player.userId === guestId && " (you)"}
                  </span>
                  {player.isBot && (
                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/60">
                      🤖 BOT
                    </span>
                  )}
                  {isHost && player.isBot && (
                    <button
                      onClick={() => removeBot(player.userId)}
                      aria-label={`Remove ${player.username}`}
                      className="cursor-pointer text-white/40 transition-colors hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
                    >
                      ✕
                    </button>
                  )}
                  {player.userId !== guestId && !player.isConnected && (
                    <span className="text-xs text-red-400">offline</span>
                  )}
                </div>
              ))}
              {teamB.length < 2 && (
                <div className="flex h-10 items-center justify-center rounded-lg border border-dashed border-white/20 text-xs text-white/20">
                  Empty seat
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Team switch button */}
        {myPlayer && (
          <div className="flex justify-center">
            <Button
              onClick={handleSwitchTeam}
              data-testid="switch-team-btn"
              variant="outline"
              className="text-sm"
            >
              Switch to {myTeam === 0 ? "Team B" : "Team A"}
            </Button>
          </div>
        )}

        {/* Add bot (dev/testing only) */}
        {isHost && allowBots && playerCount < 4 && (
          <div className="flex justify-center">
            <Button
              onClick={addBot}
              data-testid="add-bot-btn"
              variant="secondary"
              className="text-sm"
            >
              🤖 Add Bot
            </Button>
          </div>
        )}

        {/* Spectators */}
        {spectators.length > 0 && (
          <div className="rounded-lg border border-white/10 bg-black/30 p-4">
            <h3 className="mb-2 text-sm font-medium text-white/60">
              Spectators ({spectators.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {spectators.map((s) => (
                <span
                  key={s.id}
                  className="rounded-full bg-black/30 px-3 py-1 text-sm text-white/60"
                >
                  👁 {s.username}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={leaveRoom}
            data-testid="leave-room-btn"
            variant="outline"
            size="lg"
            className="flex-1"
          >
            Leave
          </Button>
          {isHost && (
            <Button
              onClick={startGame}
              data-testid="start-game-btn"
              disabled={!canStart}
              size="lg"
              className="flex-1"
            >
              {canStart ? "Start Game" : `Need ${4 - playerCount} more`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

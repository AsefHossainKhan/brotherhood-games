'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { initSocket, useSocketStore } from '@/stores/socketStore';
import { useSocket } from '@/hooks/useSocket';
import { useRoom } from '@/hooks/useRoom';
import { motion } from 'framer-motion';

export default function HomePage() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState('');
  const [username, setUsername] = useState('');
  const [mounted, setMounted] = useState(false);
  const [spectateMode, setSpectateMode] = useState(false);
  const isConnected = useSocketStore((s) => s.isConnected);
  const roomCode = useRoom().roomCode;

  // Initialize socket on mount
  useEffect(() => {
    initSocket();
    const saved = localStorage.getItem('brotherhood_username') ?? '';
    setUsername(saved);
    setMounted(true);
  }, []);

  // Socket event listeners
  useSocket();

  // Redirect to room when room code is set
  useEffect(() => {
    if (roomCode) {
      router.push(`/room/${roomCode}`);
    }
  }, [roomCode, router]);

  const { createRoom, joinRoom, becomeSpectator, updateUsername: syncUsername } = useRoom();

  const handleCreateRoom = () => {
    if (username) {
      syncUsername(username);
    }
    // Check for a seed in localStorage (set by E2E tests for reproducibility)
    const seedStr = localStorage.getItem('brotherhood_test_seed');
    const settings: Record<string, unknown> | undefined = seedStr
      ? { seed: parseInt(seedStr, 10) }
      : undefined;
    createRoom('twenty-nine', settings);
  };

  const handleJoinRoom = () => {
    if (!joinCode.trim()) return;
    if (username) {
      syncUsername(username);
    }
    const code = joinCode.trim().toUpperCase();
    if (spectateMode) {
      becomeSpectator(code);
    } else {
      joinRoom(code);
    }
  };

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4" style={{background:"radial-gradient(ellipse at 50% 50%,#2d5a27 0%,#1e4a1a 40%,#153812 70%,#0d2a0a 100%)"}}>
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white">🎮 Brotherhood Games</h1>
          <p className="mt-2 text-white/60">Multiplayer card game hub</p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-sm text-white/40">
              {isConnected ? 'Connected' : 'Connecting...'}
            </span>
          </div>
        </div>

        {/* Username */}
        <div>
          <label className="block text-sm font-medium text-white/80">
            Your Name
          </label>
          <input
            type="text"
            data-testid="username-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your name"
            className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-4 py-3 text-white placeholder-gray-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 backdrop-blur-sm"
          />
        </div>

        {/* Create Room */}
        <button
          onClick={handleCreateRoom}
          data-testid="create-room-btn"
          disabled={!isConnected}
          className="w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Create Room
        </button>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-sm text-white/40">or join existing</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        {/* Join Room */}
        <div className="flex gap-2">
          <input
            type="text"
            data-testid="join-code-input"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Room code"
            maxLength={4}
            className="flex-1 rounded-lg border border-white/20 bg-black/30 px-4 py-3 text-center text-lg font-mono tracking-widest text-white placeholder-gray-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 backdrop-blur-sm"
          />
          <button
            onClick={handleJoinRoom}
            disabled={!isConnected || joinCode.length < 4}
            data-testid="join-room-btn"
            className="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {spectateMode ? 'Watch' : 'Join'}
          </button>
        </div>

        {/* Spectate toggle */}
        <div className="flex items-center justify-center gap-2">
          <input
            type="checkbox"
            id="spectate-mode"
            data-testid="spectate-toggle"
            checked={spectateMode}
            onChange={(e) => setSpectateMode(e.target.checked)}
            className="h-4 w-4 rounded border-gray-600 bg-black/30 text-green-600 focus:ring-green-500"
          />
          <label htmlFor="spectate-mode" className="text-sm text-white/60">
            Watch as spectator
          </label>
        </div>

        {/* Game info */}
        <div className="rounded-xl border border-white/10 bg-black/30 p-4 backdrop-blur-sm text-center text-sm text-white/40">
          <p className="font-medium text-white/60">🇧🇩 Bangladeshi 29</p>
          <p className="mt-1">4 players • 2 teams • Counter-clockwise play</p>
        </div>
      </div>
    </div>
  );
}

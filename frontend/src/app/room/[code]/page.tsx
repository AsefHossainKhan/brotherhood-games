"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { initSocket, useSocketStore } from "@/stores/socketStore";
import { useRoomStore } from "@/stores/roomStore";
import { useSocket } from "@/hooks/useSocket";
import { useRoom } from "@/hooks/useRoom";
import { useGame } from "@/hooks/useGame";
import { Lobby } from "@/components/lobby/Lobby";
import { GameBoard } from "@/components/game/GameBoard";

export default function RoomPage() {
  const router = useRouter();
  const params = useParams();
  const roomCode = params.code as string;
  const [mounted, setMounted] = useState(false);

  const isConnected = useSocketStore((s) => s.isConnected);
  const roomId = useRoomStore((s) => s.roomId);
  const status = useRoomStore((s) => s.status);
  const { phase } = useGame();

  // Track whether we've ever been in this room, so leaving (roomId -> null)
  // doesn't trigger a spurious re-join of the room we're departing.
  const wasInRoomRef = useRef(false);
  useEffect(() => {
    if (roomId) wasInRoomRef.current = true;
  }, [roomId]);

  // Initialize socket
  useEffect(() => {
    initSocket();
    setMounted(true);
  }, []);

  // Socket listeners
  useSocket();

  // If not in this room, try to join (only on first arrival via a direct URL,
  // never when we've just left the room).
  useEffect(() => {
    if (!mounted || !isConnected) return;
    if (!roomId && !wasInRoomRef.current) {
      // We're not in a room — try to join this one
      const socket = useSocketStore.getState().socket;
      socket?.emit("JOIN_ROOM", { roomCode: roomCode.toUpperCase() });
    }
  }, [mounted, isConnected, roomId, roomCode]);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-400">Loading room...</div>
      </div>
    );
  }

  // Show lobby if waiting, game board if playing
  const isPlaying =
    status === "playing" ||
    [
      "PLAYING",
      "BIDDING",
      "TRUMP_SELECTION",
      "SECOND_DEAL",
      "DOUBLE_PHASE",
      "SCORING",
      "MATCH_COMPLETE",
    ].includes(phase);

  return (
    <div className="min-h-screen">{isPlaying ? <GameBoard /> : <Lobby />}</div>
  );
}

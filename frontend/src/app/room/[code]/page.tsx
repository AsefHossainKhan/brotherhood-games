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

  // SPEC: spec-95c801 — on every (re)connect, first try to reclaim a seat
  // reserved for this guest in this room; join afresh only if there is none.
  // Never pull the player back into a room they have just left.
  useEffect(() => {
    if (!mounted || !isConnected) return;
    if (!useRoomStore.getState().roomId && wasInRoomRef.current) return;

    const socket = useSocketStore.getState().socket;
    if (!socket) return;

    const code = roomCode.toUpperCase();
    const onReconnectFailed = (data: { roomCode: string }) => {
      if (data.roomCode.toUpperCase() !== code) return;
      socket.emit("JOIN_ROOM", { roomCode: code });
    };
    socket.once("RECONNECT_FAILED", onReconnectFailed);
    socket.emit("RECONNECT_ROOM", { roomCode: code });

    return () => {
      socket.off("RECONNECT_FAILED", onReconnectFailed);
    };
  }, [mounted, isConnected, roomCode]);

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

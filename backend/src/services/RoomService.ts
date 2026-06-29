import { prisma } from '../db/prisma';
import { Prisma } from '@prisma/client';

/**
 * Service for persisting room data to the database.
 * The GameRuntime operates on in-memory data; this service syncs to MySQL.
 */
export class RoomService {
  /** Persist a new room to the database. */
  static async createRoom(
    roomId: string,
    code: string,
    gameType: string,
    hostId: string,
    settings: Record<string, unknown>
  ) {
    return prisma.room.create({
      data: {
        id: roomId,
        code,
        gameType,
        hostId,
        settings: settings as Prisma.InputJsonValue,
      },
    });
  }

  /** Update room status. */
  static async updateStatus(roomId: string, status: string) {
    return prisma.room.update({
      where: { id: roomId },
      data: { status },
    });
  }

  /** Add a player to a room in the database. */
  static async addPlayer(roomId: string, userId: string, seat: number | null) {
    return prisma.roomPlayer.create({
      data: {
        roomId,
        userId,
        seat,
      },
    });
  }

  /** Remove a player from a room. */
  static async removePlayer(roomId: string, userId: string) {
    return prisma.roomPlayer.deleteMany({
      where: { roomId, userId },
    });
  }

  /** Create a match record. */
  static async createMatch(matchId: string, roomId: string, state: unknown) {
    return prisma.match.create({
      data: {
        id: matchId,
        roomId,
        state: state as any,
      },
    });
  }

  /** Update match state. */
  static async updateMatch(matchId: string, state: unknown, status?: string) {
    return prisma.match.update({
      where: { id: matchId },
      data: {
        state: state as any,
        ...(status ? { status } : {}),
      },
    });
  }

  /** Finish a match. */
  static async finishMatch(matchId: string) {
    return prisma.match.update({
      where: { id: matchId },
      data: {
        status: 'completed',
        endedAt: new Date(),
      },
    });
  }

  /** Find a room by code. */
  static async findByCode(code: string) {
    return prisma.room.findUnique({
      where: { code },
      include: { players: true, spectators: true },
    });
  }
}

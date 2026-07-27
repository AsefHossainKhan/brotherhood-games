import { describe, it, expect } from "vitest";
import {
  getMultiplier,
  canDeclareDouble,
  calculateTeamPoints,
  didDeclarerSucceed,
  calculateMatchPoints,
  calculateBonusPoints,
  calculateTricksWonPerTeam,
  checkSetCompletion,
  updateScore,
} from "./scoring";
import type { DoubleLevel, MatchScore } from "../types";
import type { Card, Suit } from "@brotherhood/shared";

const card = (suit: Suit, rank: string): Card => ({ suit, rank }) as Card;

describe("getMultiplier", () => {
  it("normal = 1", () => expect(getMultiplier("normal")).toBe(1));
  it("double = 2", () => expect(getMultiplier("double")).toBe(2));
  it("redouble = 4", () => expect(getMultiplier("redouble")).toBe(4));
  it("fullset = 6", () => expect(getMultiplier("fullset")).toBe(6));
});

describe("canDeclareDouble", () => {
  // callerTeam = who wants to double
  // declarerTeam = who made the bid

  it("Double: only opponents, from normal", () => {
    expect(canDeclareDouble("double", "normal", 1, 0)).toBe(true); // opponent
    expect(canDeclareDouble("double", "normal", 0, 0)).toBe(false); // same team
  });

  it("Double: cannot declare if already doubled", () => {
    expect(canDeclareDouble("double", "double", 1, 0)).toBe(false);
  });

  it("Re-double: only declarer team, from double", () => {
    expect(canDeclareDouble("redouble", "double", 0, 0)).toBe(true); // same team
    expect(canDeclareDouble("redouble", "double", 1, 0)).toBe(false); // opponent
  });

  it("Re-double: cannot declare from normal", () => {
    expect(canDeclareDouble("redouble", "normal", 0, 0)).toBe(false);
  });

  it("Full set: only opponents, from redouble", () => {
    expect(canDeclareDouble("fullset", "redouble", 1, 0)).toBe(true); // opponent
    expect(canDeclareDouble("fullset", "redouble", 0, 0)).toBe(false); // same team
  });

  it("Full set: cannot declare from double", () => {
    expect(canDeclareDouble("fullset", "double", 1, 0)).toBe(false);
  });
});

describe("calculateTeamPoints", () => {
  const teams = new Map<string, 0 | 1>([
    ["p1", 0],
    ["p2", 1],
    ["p3", 0],
    ["p4", 1],
  ]);

  it("should award trick points to the winner team", () => {
    const tricks = [
      {
        plays: [
          { playerId: "p1", card: card("hearts", "J") }, // 3 pts
          { playerId: "p2", card: card("hearts", "9") }, // 2 pts
          { playerId: "p3", card: card("hearts", "A") }, // 1 pt
          { playerId: "p4", card: card("hearts", "K") }, // 0 pts
        ],
        winnerId: "p1", // team 0
      },
    ];
    const [team0, team1] = calculateTeamPoints(tricks, teams);
    expect(team0).toBe(6); // 3+2+1+0
    expect(team1).toBe(0);
  });

  it("should split points across multiple tricks", () => {
    const tricks = [
      {
        plays: [
          { playerId: "p1", card: card("hearts", "J") },
          { playerId: "p2", card: card("hearts", "7") },
          { playerId: "p3", card: card("hearts", "8") },
          { playerId: "p4", card: card("hearts", "K") },
        ],
        winnerId: "p1", // team 0 gets 3 pts
      },
      {
        plays: [
          { playerId: "p2", card: card("spades", "9") },
          { playerId: "p3", card: card("spades", "10") },
          { playerId: "p4", card: card("spades", "A") },
          { playerId: "p1", card: card("spades", "7") },
        ],
        winnerId: "p2", // team 1 gets 4 pts
      },
    ];
    const [team0, team1] = calculateTeamPoints(tricks, teams);
    expect(team0).toBe(3);
    expect(team1).toBe(4);
  });

  it("total points across all tricks should sum to 28", () => {
    // Build 8 tricks with all 32 cards
    const suits: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
    const ranks = ["J", "9", "A", "10", "K", "Q", "8", "7"];
    const tricks = suits.map((suit, si) => ({
      plays: ranks.map((rank, ri) => ({
        playerId: `p${(ri % 4) + 1}`,
        card: card(suit, rank),
      })),
      winnerId: "p1",
    }));
    const [team0] = calculateTeamPoints(tricks, teams);
    expect(team0).toBe(28); // all 28 points to team 0
  });

  it("should handle unknown winner gracefully", () => {
    const tricks = [
      {
        plays: [{ playerId: "unknown", card: card("hearts", "J") }],
        winnerId: "unknown",
      },
    ];
    const [team0, team1] = calculateTeamPoints(tricks, teams);
    expect(team0).toBe(0);
    expect(team1).toBe(0);
  });
});

describe("didDeclarerSucceed", () => {
  it("succeeds when points >= effective bid", () => {
    expect(didDeclarerSucceed(20, 20)).toBe(true);
    expect(didDeclarerSucceed(21, 20)).toBe(true);
    expect(didDeclarerSucceed(28, 20)).toBe(true);
  });

  it("fails when points < effective bid", () => {
    expect(didDeclarerSucceed(19, 20)).toBe(false);
    expect(didDeclarerSucceed(0, 16)).toBe(false);
    expect(didDeclarerSucceed(15, 16)).toBe(false);
  });

  it("edge case: exactly at minimum bid (16)", () => {
    expect(didDeclarerSucceed(16, 16)).toBe(true);
    expect(didDeclarerSucceed(15, 16)).toBe(false);
  });
});

describe("calculateMatchPoints", () => {
  it("declarer succeeds: only declarer team gets +multiplier, opponent unchanged", () => {
    const result = calculateMatchPoints(0, true, 1);
    expect(result).toEqual([1, 0]);
  });

  it("declarer fails: only declarer team gets -multiplier, opponent unchanged", () => {
    const result = calculateMatchPoints(0, false, 1);
    expect(result).toEqual([-1, 0]);
  });

  it("with double multiplier, only declarer team changes", () => {
    const result = calculateMatchPoints(1, true, 2);
    expect(result).toEqual([0, 2]);
  });
});

describe("calculateBonusPoints", () => {
  const teams = new Map<string, 0 | 1>([
    ["p1", 0],
    ["p2", 1],
    ["p3", 0],
    ["p4", 1],
  ]);

  it("should give +1 bonus for winning all 8 tricks", () => {
    const tricksWon: [number, number] = [8, 0];
    const result = calculateBonusPoints(tricksWon, 0);
    expect(result).toEqual([1, 0]);
  });

  it("should give +1 bonus to team 1 for winning all 8 tricks", () => {
    const tricksWon: [number, number] = [0, 8];
    const result = calculateBonusPoints(tricksWon, 1);
    expect(result).toEqual([0, 1]);
  });

  it("should give -1 bonus to declarer team for winning 0 tricks, opponent unchanged", () => {
    const tricksWon: [number, number] = [0, 8];
    const result = calculateBonusPoints(tricksWon, 0);
    expect(result).toEqual([-1, 0]);
  });

  it("should give -1 bonus to opponent team if they bid and got 0 tricks, other team unchanged", () => {
    const tricksWon: [number, number] = [8, 0];
    const result = calculateBonusPoints(tricksWon, 1);
    expect(result).toEqual([0, -1]);
  });

  it("no bonus for split tricks", () => {
    const tricksWon: [number, number] = [4, 4];
    const result = calculateBonusPoints(tricksWon, 0);
    expect(result).toEqual([0, 0]);
  });
});

describe("calculateTricksWonPerTeam", () => {
  const teams = new Map<string, 0 | 1>([
    ["p1", 0],
    ["p2", 1],
    ["p3", 0],
    ["p4", 1],
  ]);

  it("should count tricks won by each team", () => {
    const tricks = [
      { winnerId: "p1" },
      { winnerId: "p2" },
      { winnerId: "p1" },
      { winnerId: "p3" },
      { winnerId: "p2" },
      { winnerId: "p1" },
      { winnerId: "p4" },
      { winnerId: "p2" },
    ];
    const result = calculateTricksWonPerTeam(tricks, teams);
    expect(result).toEqual([4, 4]);
  });

  it("should handle all tricks won by one team", () => {
    const tricks = Array(8).fill({ winnerId: "p1" });
    const result = calculateTricksWonPerTeam(tricks, teams);
    expect(result).toEqual([8, 0]);
  });
});

describe("checkSetCompletion", () => {
  it("team 0 reaches +threshold", () => {
    const result = checkSetCompletion([6, 0], 6);
    expect(result).toEqual({ setCompleted: true, winner: 0 });
  });

  it("team 0 reaches -threshold", () => {
    const result = checkSetCompletion([-6, 0], 6);
    expect(result).toEqual({ setCompleted: true, winner: 1 });
  });

  it("team 1 reaches +threshold", () => {
    const result = checkSetCompletion([0, 6], 6);
    expect(result).toEqual({ setCompleted: true, winner: 1 });
  });

  it("team 1 reaches -threshold", () => {
    const result = checkSetCompletion([0, -6], 6);
    expect(result).toEqual({ setCompleted: true, winner: 0 });
  });

  it("no set completed", () => {
    const result = checkSetCompletion([3, 2], 6);
    expect(result).toEqual({ setCompleted: false, winner: null });
  });

  it("exactly at threshold", () => {
    const result = checkSetCompletion([6, 0], 6);
    expect(result.setCompleted).toBe(true);
  });

  it("beyond threshold", () => {
    const result = checkSetCompletion([8, 0], 6);
    expect(result.setCompleted).toBe(true);
  });
});

describe("updateScore", () => {
  const currentScore: MatchScore = {
    teamPoints: [0, 0],
    matchPoints: [0, 0],
    sets: [0, 0],
    lastBidResult: null,
  };

  it("should add match points and bonus points", () => {
    const result = updateScore(
      currentScore,
      [15, 13],
      [1, -1],
      [0, 0],
      true,
      6,
    );
    expect(result.matchPoints).toEqual([1, -1]);
  });

  it("should reset match points after set completion", () => {
    const scoreWithHighPoints: MatchScore = {
      ...currentScore,
      matchPoints: [5, -5],
    };
    const result = updateScore(
      scoreWithHighPoints,
      [20, 8],
      [1, -1],
      [0, 0],
      true,
      6,
    );
    // 5 + 1 = 6, which reaches threshold, so reset to 0,0
    expect(result.matchPoints).toEqual([0, 0]);
    expect(result.sets[0]).toBe(1);
  });

  it("should handle negative threshold", () => {
    const scoreWithLowPoints: MatchScore = {
      ...currentScore,
      matchPoints: [-5, 5],
    };
    const result = updateScore(
      scoreWithLowPoints,
      [8, 20],
      [-1, 1],
      [0, 0],
      false,
      6,
    );
    // -5 + (-1) = -6, which reaches threshold, so reset to 0,0
    expect(result.matchPoints).toEqual([0, 0]);
    expect(result.sets[1]).toBe(1);
  });

  it("should include bonus points in calculation", () => {
    const result = updateScore(
      currentScore,
      [28, 0],
      [1, -1],
      [1, -1],
      true,
      6,
    );
    // 0 + 1 + 1 = 2 match points for team 0
    expect(result.matchPoints).toEqual([2, -2]);
  });
});

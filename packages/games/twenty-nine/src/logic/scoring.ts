import type { Suit } from "@brotherhood/shared";
import type { DoubleLevel, MatchScore } from "../types";
import {
  MULTIPLIER_NORMAL,
  MULTIPLIER_DOUBLE,
  MULTIPLIER_REDOUBLE,
  MULTIPLIER_FULLSET,
} from "@brotherhood/shared";

/**
 * Get the multiplier for a double level.
 */
export function getMultiplier(level: DoubleLevel): number {
  switch (level) {
    case "normal":
      return MULTIPLIER_NORMAL;
    case "double":
      return MULTIPLIER_DOUBLE;
    case "redouble":
      return MULTIPLIER_REDOUBLE;
    case "fullset":
      return MULTIPLIER_FULLSET;
  }
}

/**
 * Check if a double declaration is valid.
 *
 * Sequence: Double → Re-Double → Full Set
 * - Double: only opponents of the declarer
 * - Re-Double: only declarer's team
 * - Full Set: only opponents of the declarer
 */
export function canDeclareDouble(
  level: DoubleLevel,
  currentLevel: DoubleLevel,
  callerTeam: 0 | 1,
  declarerTeam: 0 | 1,
): boolean {
  const isOpponent = callerTeam !== declarerTeam;
  const isDeclarerTeam = callerTeam === declarerTeam;

  switch (level) {
    case "double":
      return currentLevel === "normal" && isOpponent;
    case "redouble":
      return currentLevel === "double" && isDeclarerTeam;
    case "fullset":
      return currentLevel === "redouble" && isOpponent;
    default:
      return false;
  }
}

/**
 * Calculate team points from completed tricks.
 *
 * Points per card:
 * J = 3, 9 = 2, A = 1, 10 = 1, K/Q/8/7 = 0
 * Total deck points = 28
 *
 * @param tricks All completed tricks
 * @param teams Map of playerId -> team (0 or 1)
 * @returns [team0Points, team1Points]
 */
export function calculateTeamPoints(
  tricks: {
    plays: { playerId: string; card: { suit: string; rank: string } }[];
    winnerId: string;
  }[],
  teams: Map<string, 0 | 1>,
): [number, number] {
  const points: [number, number] = [0, 0];

  for (const trick of tricks) {
    const winnerTeam = teams.get(trick.winnerId);
    if (winnerTeam === undefined) continue;

    let trickPoints = 0;
    for (const play of trick.plays) {
      const rank = play.card.rank;
      if (rank === "J") trickPoints += 3;
      else if (rank === "9") trickPoints += 2;
      else if (rank === "A") trickPoints += 1;
      else if (rank === "10") trickPoints += 1;
    }

    points[winnerTeam] += trickPoints;
  }

  return points;
}

/**
 * Determine if the declarer's bid succeeded.
 */
export function didDeclarerSucceed(
  teamPoints: number,
  effectiveBid: number,
): boolean {
  return teamPoints >= effectiveBid;
}

/**
 * Calculate match points based on bid result and multiplier.
 *
 * Normal: ±1
 * Double: ±2
 * Re-Double: ±4
 * Full Set: ±6
 *
 * Only the team that took the bid (the declarer team) has its score changed.
 * The non-bidding team never has any score change.
 * If declarer succeeds: declarer team gets +matchPoints.
 * If declarer fails: declarer team gets -matchPoints.
 */
export function calculateMatchPoints(
  declarerTeam: 0 | 1,
  bidSuccess: boolean,
  multiplier: number,
): [number, number] {
  const matchPoints = multiplier;
  const result: [number, number] = [0, 0];

  // Only the bidding team's score changes.
  result[declarerTeam] = bidSuccess ? matchPoints : -matchPoints;

  return result;
}

/**
 * Check if a set has been completed (cumulative score reaches threshold).
 *
 * A set is completed when either team's match points reach ±threshold.
 * If Team 0 reaches +threshold, Team 0 wins the set.
 * If Team 0 reaches -threshold, Team 1 wins the set.
 * If Team 1 reaches +threshold, Team 1 wins the set.
 * If Team 1 reaches -threshold, Team 0 wins the set.
 */
export function checkSetCompletion(
  cumulativeScores: [number, number],
  threshold: number,
): { setCompleted: boolean; winner: 0 | 1 | null } {
  // Team 0 reaches +threshold → Team 0 wins
  if (cumulativeScores[0] >= threshold) {
    return { setCompleted: true, winner: 0 };
  }
  // Team 0 reaches -threshold → Team 1 wins
  if (cumulativeScores[0] <= -threshold) {
    return { setCompleted: true, winner: 1 };
  }
  // Team 1 reaches +threshold → Team 1 wins
  if (cumulativeScores[1] >= threshold) {
    return { setCompleted: true, winner: 1 };
  }
  // Team 1 reaches -threshold → Team 0 wins
  if (cumulativeScores[1] <= -threshold) {
    return { setCompleted: true, winner: 0 };
  }

  return { setCompleted: false, winner: null };
}

/**
 * Calculate bonus points for special scenarios.
 *
 * The +1 / -1 modifier only ever applies to the team that took the bid
 * (the declarer team). The non-bidding team never has any score change.
 *
 * - Declarer team wins all 8 tricks: +1 modifier for the declarer team
 * - Declarer team wins 0 tricks: -1 modifier for the declarer team
 *
 * @param tricksWonPerTeam [team0TricksWon, team1TricksWon]
 * @param declarerTeam Which team was the declarer
 * @returns [team0Bonus, team1Bonus]
 */
export function calculateBonusPoints(
  tricksWonPerTeam: [number, number],
  declarerTeam: 0 | 1,
): [number, number] {
  const bonuses: [number, number] = [0, 0];
  const totalTricks = tricksWonPerTeam[0] + tricksWonPerTeam[1];

  // All 8 tricks bonus: +1 for the declarer team if it won every trick.
  if (totalTricks === 8 && tricksWonPerTeam[declarerTeam] === totalTricks) {
    bonuses[declarerTeam] += 1;
  }

  // Zero tricks penalty: if the declarer team got 0 tricks, they get -1.
  if (tricksWonPerTeam[declarerTeam] === 0) {
    bonuses[declarerTeam] -= 1;
  }

  return bonuses;
}

/**
 * Calculate the number of tricks won by each team.
 */
export function calculateTricksWonPerTeam(
  completedTricks: { winnerId: string }[],
  teams: Map<string, 0 | 1>,
): [number, number] {
  const tricksWon: [number, number] = [0, 0];

  for (const trick of completedTricks) {
    if (!trick.winnerId) continue;
    const winnerTeam = teams.get(trick.winnerId);
    if (winnerTeam !== undefined) {
      tricksWon[winnerTeam]++;
    }
  }

  return tricksWon;
}

/**
 * Update the match score after a game.
 *
 * If a set is completed (threshold reached), scores reset to 0,0 and the set winner gets +1 set.
 */
export function updateScore(
  currentScore: MatchScore,
  teamPoints: [number, number],
  matchPointsResult: [number, number],
  bonusPoints: [number, number],
  bidSuccess: boolean,
  setThreshold: number,
): MatchScore {
  // Calculate new match points
  const newMatchPoints: [number, number] = [
    currentScore.matchPoints[0] + matchPointsResult[0] + bonusPoints[0],
    currentScore.matchPoints[1] + matchPointsResult[1] + bonusPoints[1],
  ];

  const newSets = [...currentScore.sets] as [number, number];

  // Check if a set has been completed
  const setResult = checkSetCompletion(newMatchPoints, setThreshold);
  if (setResult.setCompleted && setResult.winner !== null) {
    newSets[setResult.winner]++;

    // Reset match points to 0,0 after set completion
    return {
      teamPoints,
      matchPoints: [0, 0],
      sets: newSets,
      lastBidResult: bidSuccess ? "success" : "fail",
    };
  }

  return {
    teamPoints,
    matchPoints: newMatchPoints,
    sets: newSets,
    lastBidResult: bidSuccess ? "success" : "fail",
  };
}

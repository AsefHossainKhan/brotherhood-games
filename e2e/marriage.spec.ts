/**
 * E2E Tests: Marriage Feature
 *
 * Tests that a marriage stays hidden until the trump is revealed, joker mode
 * (no marriage), and panel auto-hide behavior.
 *
 * Requires: `npm run dev` (frontend :3000 + backend :3001)
 */
import { test, expect } from './fixtures';
import {
  setupFullGame,
  waitForPhase,
  skipDoublePhase,
  runBiddingScenario,
  doQuickTrumpSelection,
  selectJokerTrump,
} from './helpers';

/**
 * Seeds verified against actual engine dealing:
 * - 10004: Player 2 has marriage in hearts (teammate, bidding team when P0 declarer)
 * - 10007: Player 3 has marriage in clubs (opponent, defending team when P0 declarer)
 * - 10001: No marriage in any suit for any player
 */
const SEEDS = {
  /** Player 2 (teammate) has hearts marriage → bidding team */
  biddingTeamHearts: '10004',
  /** Player 3 (opponent) has clubs marriage → defending team */
  defendingTeamClubs: '10007',
  /** No marriage at all */
  noMarriage: '10001',
} as const;

// ============================================================
//  1. Marriage stays hidden until the trump is revealed (DEC-3)
// ============================================================
//
// A marriage is made known only at the trump reveal. Declaring it at the deal
// would tell the room the hidden trump suit, and set a suit trump apart from a
// Joker (SPEC-8). The reveal-time declaration and its +/-4 adjustment (bounded
// 16..28) are covered by the engine unit tests.

test.describe('Marriage — hidden until reveal', () => {
  for (const [name, seed, suit] of [
    ['teammate (bidding team) holds the marriage', SEEDS.biddingTeamHearts, 'hearts'],
    ['opponent (defending team) holds the marriage', SEEDS.defendingTeamClubs, 'clubs'],
  ] as const) {
    test(`no marriage is shown at trump selection or in play before the reveal: ${name}`, async ({ players }) => {
      await setupFullGame(players, { seed });

      await runBiddingScenario(players, [
        { type: 'bid', value: 16 },
        { type: 'pass' },
        { type: 'pass' },
        { type: 'pass' },
      ]);

      await doQuickTrumpSelection(players, suit);
      await skipDoublePhase(players);

      await waitForPhase(players, 'Playing', 30_000);
      await players[0].page.waitForTimeout(1_000);

      for (const player of players) {
        await expect(player.page.getByTestId('marriage-panel')).not.toBeVisible();
        await expect(player.page.getByText(`${suit} →`)).not.toBeVisible();
      }
    });
  }
});

// ============================================================
//  4. No Marriage in Joker Mode
// ============================================================

test.describe('No Marriage — Joker Mode', () => {
  test('no marriage panel when joker trump is selected', async ({ players }) => {
    // Seed 10001: no marriage in any suit
    await setupFullGame(players, { seed: SEEDS.noMarriage });

    await runBiddingScenario(players, [
      { type: 'bid', value: 16 },
      { type: 'pass' },
      { type: 'pass' },
      { type: 'pass' },
    ]);

    await selectJokerTrump(players);
    await skipDoublePhase(players);

    await waitForPhase(players, 'Playing', 30_000);
    await players[0].page.waitForTimeout(1_000);

    // Marriage panel should NOT appear
    const marriagePanel = players[0].page.getByTestId('marriage-panel');
    await expect(marriagePanel).not.toBeVisible();

    // ScoreBoard should NOT show marriage info
    const marriageText = players[0].page.getByText('Marriage', { exact: false });
    // The only "Marriage" text should be absent from scoreboard
    // (it may appear in the MarriagePanel but that's hidden)
    await expect(marriageText).not.toBeVisible();
  });
});

// ============================================================
//  5. Marriage Panel Auto-Hide
// ============================================================

test.describe('Marriage Panel Behavior', () => {
  // A marriage now appears only at the trump reveal (DEC-3), so this needs a
  // seed and a play sequence in which a void player reveals while the holder
  // still has the K and Q of trump. Not yet worked out against a running stack.
  test.fixme('marriage panel auto-hides after 5 seconds', async ({ players }) => {
    await setupFullGame(players, { seed: SEEDS.defendingTeamClubs });

    await runBiddingScenario(players, [
      { type: 'bid', value: 16 },
      { type: 'pass' },
      { type: 'pass' },
      { type: 'pass' },
    ]);

    await doQuickTrumpSelection(players, 'clubs');

    const marriagePanel = players[0].page.getByTestId('marriage-panel');
    await expect(marriagePanel).toBeVisible({ timeout: 10_000 });

    await players[0].page.waitForTimeout(6_000);

    await expect(marriagePanel).not.toBeVisible();
  });
});

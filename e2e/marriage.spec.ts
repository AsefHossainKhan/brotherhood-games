/**
 * E2E Tests: Marriage Feature
 *
 * Tests marriage declaration, effective bid adjustment, joker mode (no marriage),
 * and panel auto-hide behavior.
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
//  1. Marriage Detection & Toast
// ============================================================

test.describe('Marriage Declaration', () => {
  test('marriage panel appears after trump selection with suit trump', async ({ players }) => {
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
    await expect(marriagePanel.getByText('Marriage Declared!')).toBeVisible();
    await expect(marriagePanel.getByText('clubs')).toBeVisible();
  });
});

// ============================================================
//  2. Marriage Effective Bid — Bidding Team
// ============================================================

test.describe('Marriage — Bidding Team', () => {
  test('marriage on teammate (bidding team) shows effective bid', async ({ players }) => {
    // Seed 10004: Player 2 (teammate, team 0) has marriage in hearts
    await setupFullGame(players, { seed: SEEDS.biddingTeamHearts });

    await runBiddingScenario(players, [
      { type: 'bid', value: 16 },
      { type: 'pass' },
      { type: 'pass' },
      { type: 'pass' },
    ]);

    await doQuickTrumpSelection(players, 'hearts');
    await skipDoublePhase(players);

    await waitForPhase(players, 'Playing', 30_000);
    await players[0].page.waitForTimeout(1_000);

    // Marriage on bidding team: effectiveBid = max(16, 16-4) = 16
    const marriageInfo = players[0].page.getByText('hearts → 16');
    await expect(marriageInfo).toBeVisible({ timeout: 10_000 });
  });
});

// ============================================================
//  3. Marriage Effective Bid — Defending Team
// ============================================================

test.describe('Marriage — Defending Team', () => {
  test('marriage on opponent (defending team) raises effective bid', async ({ players }) => {
    // Seed 10007: Player 3 (opponent, team 1) has marriage in clubs
    await setupFullGame(players, { seed: SEEDS.defendingTeamClubs });

    await runBiddingScenario(players, [
      { type: 'bid', value: 16 },
      { type: 'pass' },
      { type: 'pass' },
      { type: 'pass' },
    ]);

    await doQuickTrumpSelection(players, 'clubs');
    await skipDoublePhase(players);

    await waitForPhase(players, 'Playing', 30_000);
    await players[0].page.waitForTimeout(1_000);

    // Marriage on defending team: effectiveBid = min(28, 16+4) = 20
    const marriageInfo = players[0].page.getByText('clubs → 20');
    await expect(marriageInfo).toBeVisible({ timeout: 10_000 });
  });
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
  test('marriage panel auto-hides after 5 seconds', async ({ players }) => {
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

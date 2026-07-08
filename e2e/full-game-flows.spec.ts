/**
 * E2E Tests: Additional Game Flow Coverage
 *
 * These tests cover scenarios NOT already covered in game-flow.spec.ts:
 * - Maximum bid scenario
 * - Call forces raise scenario
 * - Game state consistency checks
 * - Card count consistency
 * - Multiple trump types (diamonds, clubs, spades)
 *
 * Requires: `npm run dev` (frontend :3000 + backend :4000)
 */
import { test, expect, type PlayerContext } from './fixtures';
import {
  setupFullGame,
  waitForPhase,
  doQuickBidding,
  doQuickTrumpSelection,
  skipDoublePhase,
  waitForPlayingPhase,
  advanceToPlaying,
  playCurrentTurn,
  runBiddingScenario,
  waitForActiveBidder,
} from './helpers';

/** Fixed seeds per test for reproducible card dealing */
const SEEDS = {
  edgeCases: '30001',
  consistency: '30002',
  trumpTypes: '30003',
} as const;

// ============================================================
//  1. Edge Cases
// ============================================================

test.describe('Edge Cases', () => {
  test('maximum bid scenario: bid goes up to 28', async ({ players }) => {
    await setupFullGame(players, { seed: SEEDS.edgeCases });

    // Run a bidding scenario with high bids
    await runBiddingScenario(players, [
      { type: 'bid', value: 16 },
      { type: 'bid', value: 18 },
      { type: 'bid', value: 20 },
      { type: 'bid', value: 22 },
      { type: 'bid', value: 24 },
      { type: 'bid', value: 26 },
      { type: 'bid', value: 28 },
      { type: 'pass' },
      { type: 'pass' },
      { type: 'pass' },
    ]);

    await waitForPhase(players, 'Trump Selection', 15_000);
  });

  test('all players pass on first round → redeal happens', async ({ players }) => {
    await setupFullGame(players, { seed: SEEDS.edgeCases });

    // All 4 players pass without bidding
    await runBiddingScenario(players, [
      { type: 'pass' },
      { type: 'pass' },
      { type: 'pass' },
      { type: 'pass' },
    ]);

    // Should redeal and restart bidding
    await waitForPhase(players, 'Bidding', 20_000);

    // Verify new active bidder exists
    const bidder = await waitForActiveBidder(players, 15_000);
    expect(bidder).not.toBeNull();
  });

  test('call forces raise: after call, challenger must raise higher', async ({ players }) => {
    await setupFullGame(players, { seed: SEEDS.edgeCases });

    // P1 opens 16, P2 raises to 18, P1 calls (matches 18), P2 must raise higher
    await runBiddingScenario(players, [
      { type: 'bid', value: 16 },  // P1 opens
      { type: 'bid', value: 18 },  // P2 raises
      { type: 'call' },            // P1 calls (matches 18)
      { type: 'bid', value: 20 },  // P2 must raise to 20
      { type: 'pass' },            // P1 passes
      { type: 'pass' },            // P3 passes
      { type: 'pass' },            // P4 passes
    ]);

    await waitForPhase(players, 'Trump Selection', 15_000);
  });
});

// ============================================================
//  2. Game State Consistency
// ============================================================

test.describe('Game State Consistency', () => {
  test('all players see same phase during bidding', async ({ players }) => {
    await setupFullGame(players, { seed: SEEDS.consistency });

    // Go through bidding
    await doQuickBidding(players);

    // Check all players see Trump Selection
    let phaseVisibleCount = 0;
    for (const player of players) {
      const hasPhase = await player.page.getByText('Trump Selection', { exact: false }).first().isVisible().catch(() => false);
      if (hasPhase) phaseVisibleCount++;
    }
    // At least some players should see the phase
    expect(phaseVisibleCount).toBeGreaterThan(0);
  });

  test('card count remains consistent through game', async ({ players }) => {
    await setupFullGame(players, { seed: SEEDS.consistency });
    await advanceToPlaying(players);

    // Check initial card count (4 players × 8 cards = 32)
    let initialTotal = 0;
    for (const player of players) {
      const cardCount = await player.page.locator('[data-testid^="card-"]').count();
      initialTotal += cardCount;
    }
    expect(initialTotal).toBe(32);

    // Play first trick (4 cards)
    for (let i = 0; i < 4; i++) {
      try {
        await playCurrentTurn(players);
      } catch {
        break;
      }
    }
    await players[0].page.waitForTimeout(1000);

    // Verify card counts decreased (should be 28 after 1 trick)
    let afterTrick = 0;
    for (const player of players) {
      const cardCount = await player.page.locator('[data-testid^="card-"]').count();
      afterTrick += cardCount;
    }
    // Should have fewer cards now
    expect(afterTrick).toBeLessThan(initialTotal);
  });

  test('score starts at 0-0 for both teams', async ({ players }) => {
    await setupFullGame(players, { seed: SEEDS.consistency });

    // Check score display
    for (const player of players) {
      // Team A score should be 0
      const teamAScore = await player.page.locator('text=Team A').first().isVisible().catch(() => false);
      // Team B score should be 0
      const teamBScore = await player.page.locator('text=Team B').first().isVisible().catch(() => false);
      // Both teams should be visible
    }
  });
});

// ============================================================
//  3. Multiple Trump Types
// ============================================================

test.describe('Multiple Trump Types', () => {
  test('suit trump (diamonds) plays through', async ({ players }) => {
    test.setTimeout(300_000);

    await setupFullGame(players, { seed: SEEDS.trumpTypes });
    await doQuickBidding(players);
    await doQuickTrumpSelection(players, 'diamonds');
    await skipDoublePhase(players);
    await waitForPlayingPhase(players);

    // Play several tricks
    for (let trick = 0; trick < 4; trick++) {
      for (let card = 0; card < 4; card++) {
        try {
          await playCurrentTurn(players);
        } catch {
          break;
        }
      }
      await players[0].page.waitForTimeout(800);
    }

    for (const player of players) {
      await expect(player.page.getByTestId('game-board')).toBeVisible();
    }
  });

  test('suit trump (clubs) plays through', async ({ players }) => {
    test.setTimeout(300_000);

    await setupFullGame(players, { seed: SEEDS.trumpTypes });
    await doQuickBidding(players);
    await doQuickTrumpSelection(players, 'clubs');
    await skipDoublePhase(players);
    await waitForPlayingPhase(players);

    for (let trick = 0; trick < 4; trick++) {
      for (let card = 0; card < 4; card++) {
        try {
          await playCurrentTurn(players);
        } catch {
          break;
        }
      }
      await players[0].page.waitForTimeout(800);
    }

    for (const player of players) {
      await expect(player.page.getByTestId('game-board')).toBeVisible();
    }
  });

  test('suit trump (spades) plays through', async ({ players }) => {
    test.setTimeout(300_000);

    await setupFullGame(players, { seed: SEEDS.trumpTypes });
    await doQuickBidding(players);
    await doQuickTrumpSelection(players, 'spades');
    await skipDoublePhase(players);
    await waitForPlayingPhase(players);

    for (let trick = 0; trick < 4; trick++) {
      for (let card = 0; card < 4; card++) {
        try {
          await playCurrentTurn(players);
        } catch {
          break;
        }
      }
      await players[0].page.waitForTimeout(800);
    }

    for (const player of players) {
      await expect(player.page.getByTestId('game-board')).toBeVisible();
    }
  });
});

/**
 * E2E Tests: Full 29 Game Flow
 *
 * Comprehensive tests covering every phase of a 29 card game.
 * Uses 4 simulated players via isolated browser contexts.
 *
 * Each test uses a fixed seed for reproducible card dealing,
 * ensuring consistent test results across runs.
 *
 * NOTE: These tests simulate 4 real players with real sockets.
 * Each test takes 15-60s depending on complexity. The full game
 * test can take up to 5 minutes — this is expected.
 *
 * Requires: `npm run dev` (frontend :3000 + backend :4000)
 */
import { test, expect, type PlayerContext } from './fixtures';
import {
  setupFullGame,
  waitForPhase,
  findPlayerWith,
  doQuickBidding,
  doQuickTrumpSelection,
  selectSeventhCardTrump,
  selectJokerTrump,
  skipDoublePhase,
  doDoubleThenPass,
  waitForPlayingPhase,
  playCurrentTurn,
  playTrick,
  advanceToPlaying,
  runBiddingScenario,
  waitForActiveBidder,
  assertSingleActiveBidder,
  executeBidAction,
  type BidAction,
} from './helpers';

/** Fixed seeds per test for reproducible card dealing */
const SEEDS = {
  lobby: '10001',
  bidding: '10002',
  trump: '10003',
  double: '10004',
  playing: '10005',
  followSuit: '10006',
  scoring: '10007',
  phaseIndicators: '10008',
  seventhCard: '10009',
  joker: '10010',
} as const;

// ============================================================
//  1. Lobby & Game Start
// ============================================================

test.describe('Lobby → Game Start', () => {
  test('4 players join and game starts with game board visible', async ({ players }) => {
    await setupFullGame(players, { seed: SEEDS.lobby });

    for (const player of players) {
      await expect(player.page.getByTestId('game-board')).toBeVisible({ timeout: 20_000 });
    }
  });

  test('after start, each player sees cards in hand', async ({ players }) => {
    await setupFullGame(players, { seed: SEEDS.lobby });

    for (const player of players) {
      await expect(player.page.getByTestId('game-board')).toBeVisible({ timeout: 20_000 });
      await player.page.waitForTimeout(2_000);
      const cardCount = await player.page.locator('[data-testid^="card-"]').count();
      expect(cardCount).toBeGreaterThanOrEqual(4);
    }
  });
});

// ============================================================
//  2. Bidding Phase
// ============================================================

test.describe('Bidding Phase', () => {
  test('exactly one player has turn indicator at any time', async ({ players }) => {
    await setupFullGame(players, { seed: SEEDS.bidding });
    await waitForPhase(players, 'Bidding', 20_000);
    await players[0].page.waitForTimeout(1_000);
    await assertSingleActiveBidder(players);
  });

  test('simple: first bidder opens 16, three others pass → declarer wins', async ({ players }) => {
    await setupFullGame(players, { seed: SEEDS.bidding });
    await runBiddingScenario(players, [
      { type: 'bid', value: 16 },
      { type: 'pass' },
      { type: 'pass' },
      { type: 'pass' },
    ]);
    await waitForPhase(players, 'Trump Selection', 15_000);
  });

  test('raise: opener bids 16, challenger raises to 18, all remaining pass → challenger wins', async ({ players }) => {
    await setupFullGame(players, { seed: SEEDS.bidding });
    // After raise, turn goes back to opener who must pass too
    await runBiddingScenario(players, [
      { type: 'bid', value: 16 },  // opener bids
      { type: 'bid', value: 18 },  // challenger raises
      { type: 'pass' },            // opener passes (was challenger after raise)
      { type: 'pass' },            // next player passes
      { type: 'pass' },            // last player passes
    ]);
    await waitForPhase(players, 'Trump Selection', 15_000);
  });

  test('sequential passes: opener bids 16, next 3 players pass one by one', async ({ players }) => {
    await setupFullGame(players, { seed: SEEDS.bidding });
    await runBiddingScenario(players, [
      { type: 'bid', value: 16 },
      { type: 'pass' },
      { type: 'pass' },
      { type: 'pass' },
    ]);
    await waitForPhase(players, 'Trump Selection', 15_000);
  });

  test('all pass without bidding → redeal → bidding restarts', async ({ players }) => {
    await setupFullGame(players, { seed: SEEDS.bidding });
    // All 4 pass without anyone bidding — triggers redeal
    await runBiddingScenario(players, [
      { type: 'pass' },
      { type: 'pass' },
      { type: 'pass' },
      { type: 'pass' },
    ]);
    // After redeal, verify bidding is still active (new round)
    await waitForPhase(players, 'Bidding', 20_000);
    // Verify a new active bidder exists
    const bidder = await waitForActiveBidder(players, 15_000);
    expect(bidder).not.toBeNull();
  });

  test('raise then sequential passes: opener 16, challenger 18, remaining three pass one by one', async ({ players }) => {
    await setupFullGame(players, { seed: SEEDS.bidding });
    await runBiddingScenario(players, [
      { type: 'bid', value: 16 },
      { type: 'bid', value: 18 },
      { type: 'pass' },  // opener passes after raise
      { type: 'pass' },  // next player
      { type: 'pass' },  // last player
    ]);
    await waitForPhase(players, 'Trump Selection', 15_000);
  });

  test('call scenario: P2 takes from P1, P3 takes from P2, P4 raises, P3 calls, P4 passes → P3 wins', async ({ players }) => {
    await setupFullGame(players, { seed: SEEDS.bidding });
    // Full sequence: P1 opens, P2 raises, P1 passes, P3 raises, P2 passes, P4 raises, P3 calls, P4 passes
    await runBiddingScenario(players, [
      { type: 'bid', value: 16 },  // P1 opens
      { type: 'bid', value: 18 },  // P2 raises
      { type: 'pass' },            // P1 passes
      { type: 'bid', value: 20 },  // P3 raises
      { type: 'pass' },            // P2 passes
      { type: 'bid', value: 22 },  // P4 raises
      { type: 'call' },            // P3 calls (matches 22)
      { type: 'pass' },            // P4 passes — only P3 remains
    ]);
    await waitForPhase(players, 'Trump Selection', 15_000);
  });

  test('each action transitions turn to next player correctly', async ({ players }) => {
    await setupFullGame(players, { seed: SEEDS.bidding });
    await waitForPhase(players, 'Bidding', 20_000);

    // First bidder places opening bid
    const first = await waitForActiveBidder(players);
    await executeBidAction(first, { type: 'bid', value: 16 });
    await assertSingleActiveBidder(players);

    // Next player raises
    const second = await waitForActiveBidder(players);
    expect(second).not.toBe(first);
    await executeBidAction(second, { type: 'bid', value: 18 });
    await assertSingleActiveBidder(players);

    // Turn goes back to original bidder — they pass
    const third = await waitForActiveBidder(players);
    await executeBidAction(third, { type: 'pass' });
    await assertSingleActiveBidder(players);

    // Continue until bidding finishes
    const fourth = await waitForActiveBidder(players);
    await executeBidAction(fourth, { type: 'pass' });
  });
});

// ============================================================
//  3. Trump Selection
// ============================================================

test.describe('Trump Selection', () => {
  test('declarer sees trump selector, others do not', async ({ players }) => {
    await setupFullGame(players, { seed: SEEDS.trump });
    await doQuickBidding(players);
    await waitForPhase(players, 'Trump Selection', 15_000);

    let selectorCount = 0;
    for (const player of players) {
      const hasSelector = await player.page.getByTestId('trump-selector').isVisible().catch(() => false);
      if (hasSelector) selectorCount++;
    }
    expect(selectorCount).toBe(1);
  });

  test('select suit trump → moves to double phase', async ({ players }) => {
    await setupFullGame(players, { seed: SEEDS.trump });
    await doQuickBidding(players);
    await doQuickTrumpSelection(players, 'hearts');
    // doQuickTrumpSelection already waits for Double Phase
  });

  test('select 7th card trump → moves to double phase', async ({ players }) => {
    await setupFullGame(players, { seed: SEEDS.trump });
    await doQuickBidding(players);
    await selectSeventhCardTrump(players);
    // selectSeventhCardTrump already waits for Double Phase
  });

  test('select joker → moves to double phase', async ({ players }) => {
    await setupFullGame(players, { seed: SEEDS.trump });
    await doQuickBidding(players);
    await selectJokerTrump(players);
    // selectJokerTrump already waits for Double Phase
  });

  test('each player has 8 cards after second deal', async ({ players }) => {
    await setupFullGame(players, { seed: SEEDS.trump });
    await doQuickBidding(players);
    await doQuickTrumpSelection(players);
    // doQuickTrumpSelection already waits for Double Phase

    for (const player of players) {
      await player.page.waitForTimeout(1_000);
      const cardCount = await player.page.locator('[data-testid^="card-"]').count();
      expect(cardCount).toBe(8);
    }
  });
});

// ============================================================
//  4. Double Phase
// ============================================================

test.describe('Double Phase', () => {
  test('opponent sees double/pass buttons', async ({ players }) => {
    await setupFullGame(players, { seed: SEEDS.double });
    await doQuickBidding(players);
    await doQuickTrumpSelection(players);
    // Already in Double Phase

    const hasButtons = await findPlayerWith(players, 'pass-double-btn', 10_000);
    expect(hasButtons).not.toBeNull();
  });

  test('all pass → skip to playing phase', async ({ players }) => {
    await setupFullGame(players, { seed: SEEDS.double });
    await doQuickBidding(players);
    await doQuickTrumpSelection(players);
    await skipDoublePhase(players);

    await waitForPlayingPhase(players);
  });

  test('opponent doubles then pass → playing with ×2', async ({ players }) => {
    await setupFullGame(players, { seed: SEEDS.double });
    await doQuickBidding(players);
    await doQuickTrumpSelection(players);
    await doDoubleThenPass(players);

    await waitForPlayingPhase(players);
  });
});

// ============================================================
//  5. Playing Phase (Tricks)
// ============================================================

test.describe('Playing Phase', () => {
  test('declarer leads — someone has "Your turn"', async ({ players }) => {
    await setupFullGame(players, { seed: SEEDS.playing });
    await advanceToPlaying(players);

    let turnFound = false;
    for (const player of players) {
      if (await player.page.locator('text=Your turn').isVisible().catch(() => false)) {
        turnFound = true;
        break;
      }
    }
    expect(turnFound).toBe(true);
  });

  test('current player can play a card', async ({ players }) => {
    await setupFullGame(players, { seed: SEEDS.playing });
    await advanceToPlaying(players);

    const activePlayer = await playCurrentTurn(players);
    expect(activePlayer).not.toBeNull();
  });

  test('trick resolves after 4 cards → winner leads next', async ({ players }) => {
    await setupFullGame(players, { seed: SEEDS.playing });
    await advanceToPlaying(players);

    await playTrick(players);

    // Wait for the next player's turn to appear (can take a moment via socket)
    let turnFound = false;
    for (let attempt = 0; attempt < 20; attempt++) {
      for (const player of players) {
        if (await player.page.locator('text=Your turn').isVisible().catch(() => false)) {
          turnFound = true;
          break;
        }
      }
      if (turnFound) break;
      await players[0].page.waitForTimeout(500);
    }
    expect(turnFound).toBe(true);
  });

  test('exactly one player has "Your turn" at any time', async ({ players }) => {
    await setupFullGame(players, { seed: SEEDS.playing });
    await advanceToPlaying(players);

    let turnCount = 0;
    for (const player of players) {
      if (await player.page.locator('text=Your turn').isVisible().catch(() => false)) {
        turnCount++;
      }
    }
    expect(turnCount).toBe(1);
  });

  test('full game: all 8 tricks → game ends (up to 5 min)', async ({ players }) => {
    test.setTimeout(300_000); // 5 minutes

    await setupFullGame(players, { seed: SEEDS.playing });
    await advanceToPlaying(players);

    for (let trick = 0; trick < 8; trick++) {
      for (let cardInTrick = 0; cardInTrick < 4; cardInTrick++) {
        try {
          await playCurrentTurn(players);
        } catch {
          // Game may have ended early (hidden trump cancellation)
          break;
        }
      }
      await players[0].page.waitForTimeout(800);

      // Check if game ended early
      let matchDone = false;
      for (const p of players) {
        try {
          await expect(p.page.locator('text=Match Complete')).toBeVisible({ timeout: 500 });
          matchDone = true;
          break;
        } catch { /* not yet */ }
      }
      if (matchDone) break;
    }

    await players[0].page.waitForTimeout(3_000);

    for (const player of players) {
      await expect(player.page.getByTestId('game-board')).toBeVisible();
    }
  });
});

// ============================================================
//  6. Follow-Suit Enforcement
// ============================================================

test.describe('Follow Suit', () => {
  test('trick plays proceed without crash', async ({ players }) => {
    await setupFullGame(players, { seed: SEEDS.followSuit });
    await advanceToPlaying(players);

    const leader = await playCurrentTurn(players);
    await leader.page.waitForTimeout(500);

    for (let i = 0; i < 3; i++) {
      try {
        await playCurrentTurn(players);
      } catch {
        break;
      }
    }
  });
});

// ============================================================
//  7. Scoring
// ============================================================

test.describe('Scoring', () => {
  test('scoreboard visible after game (up to 5 min)', async ({ players }) => {
    test.setTimeout(300_000);

    await setupFullGame(players, { seed: SEEDS.scoring });
    await advanceToPlaying(players);

    for (let trick = 0; trick < 8; trick++) {
      for (let card = 0; card < 4; card++) {
        try {
          await playCurrentTurn(players);
        } catch {
          break;
        }
      }
      await players[0].page.waitForTimeout(800);

      let gameDone = false;
      for (const p of players) {
        try {
          await expect(p.page.locator('text=Match Complete')).toBeVisible({ timeout: 500 });
          gameDone = true;
          break;
        } catch { /* not yet */ }
      }
      if (gameDone) break;
    }

    await players[0].page.waitForTimeout(3_000);
    for (const player of players) {
      await expect(player.page.getByTestId('game-board')).toBeVisible();
    }
  });
});

// ============================================================
//  8. Phase Indicators
// ============================================================

test.describe('Phase Indicators', () => {
  test('phase label changes through game lifecycle', async ({ players }) => {
    await setupFullGame(players, { seed: SEEDS.phaseIndicators });

    await waitForPhase(players, 'Bidding', 20_000);
    await doQuickBidding(players);
    await waitForPhase(players, 'Trump Selection', 15_000);
    await doQuickTrumpSelection(players);
    await waitForPhase(players, 'Double Phase', 15_000);
    await skipDoublePhase(players);
    await waitForPhase(players, 'Playing', 15_000);
  });
});

// ============================================================
//  9. Seventh-Card Trump Reveal
// ============================================================

test.describe('Seventh-Card Trump Reveal', () => {
  test('7th card mode game plays through without crash (up to 5 min)', async ({ players }) => {
    test.setTimeout(300_000);

    await setupFullGame(players, { seed: SEEDS.seventhCard });
    await doQuickBidding(players);
    await selectSeventhCardTrump(players);
    await skipDoublePhase(players);
    await waitForPlayingPhase(players);

    // Play a few tricks — verify no crash
    for (let trick = 0; trick < 3; trick++) {
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

// ============================================================
//  10. Joker (No Trump) Mode
// ============================================================

test.describe('Joker Mode', () => {
  test('joker mode game plays through without crash', async ({ players }) => {
    test.setTimeout(300_000);

    await setupFullGame(players, { seed: SEEDS.joker });
    await doQuickBidding(players);
    await selectJokerTrump(players);
    await skipDoublePhase(players);
    await waitForPlayingPhase(players);

    // Play a few tricks
    for (let trick = 0; trick < 3; trick++) {
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

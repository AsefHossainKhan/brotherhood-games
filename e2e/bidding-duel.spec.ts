/**
 * E2E Tests: Bidding Duel Flow
 *
 * Tests the bidding system:
 * - Basic bidding works (open → pass × 3)
 * - Bidding with raise then all pass
 * - All pass triggers redeal
 *
 * Requires: `npm run dev` (frontend :3000 + backend :3001)
 */
import { test, expect } from './fixtures';
import {
  setupFullGame,
  waitForPhase,
  runBiddingScenario,
  doQuickBidding,
} from './helpers';

const SEEDS = {
  bidding: '10002',
};

test.describe('Bidding Duel Flow', () => {
  test('basic bidding: open 16, others pass → declarer selected', async ({ players }) => {
    await setupFullGame(players, { seed: SEEDS.bidding });
    await waitForPhase(players, 'Bidding', 20_000);

    await doQuickBidding(players);

    await waitForPhase(players, 'Trump Selection', 15_000);
  });

  test('bidding with raise: opener bids 16, challenger raises, all pass including opener', async ({ players }) => {
    await setupFullGame(players, { seed: SEEDS.bidding });
    await waitForPhase(players, 'Bidding', 20_000);

    // Open 16, raise to 18, pass × 2 (other players), then opener passes too
    await runBiddingScenario(players, [
      { type: 'bid', value: 16 },
      { type: 'bid', value: 18 },
      { type: 'pass' },
      { type: 'pass' },
      { type: 'pass' },
    ]);

    await waitForPhase(players, 'Trump Selection', 15_000);
  });

  test('all pass except opener → opener wins', async ({ players }) => {
    await setupFullGame(players, { seed: SEEDS.bidding });
    await waitForPhase(players, 'Bidding', 20_000);

    await runBiddingScenario(players, [
      { type: 'bid', value: 16 },
      { type: 'pass' },
      { type: 'pass' },
      { type: 'pass' },
    ]);

    await waitForPhase(players, 'Trump Selection', 15_000);
  });
});

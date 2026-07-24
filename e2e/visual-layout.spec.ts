import { test, expect } from './fixtures';
import { setupFullGame, doQuickBidding, doQuickTrumpSelection, skipDoublePhase, waitForPlayingPhase } from './helpers';

const SEEDS = {
  layout: '10001',
};

test.describe('@visual Card Table Layout', () => {
  test('card table renders with green felt and player seats', async ({ players }) => {
    test.setTimeout(120_000);

    await setupFullGame(players, { seed: SEEDS.layout });
    await doQuickBidding(players);
    await doQuickTrumpSelection(players, 'hearts');
    await skipDoublePhase(players);
    await waitForPlayingPhase(players);

    // Verify game board is visible
    await expect(players[0].page.getByTestId('game-board')).toBeVisible();

    // Take screenshots from all 4 player perspectives
    for (let i = 0; i < players.length; i++) {
      await players[i].page.screenshot({
        path: `test-results/visual/layout-player-${i}.png`,
        fullPage: true,
      });
    }
  });

  test('cards are visible at bottom center of screen', async ({ players }) => {
    test.setTimeout(120_000);

    await setupFullGame(players, { seed: SEEDS.layout });
    await doQuickBidding(players);
    await doQuickTrumpSelection(players, 'hearts');
    await skipDoublePhase(players);
    await waitForPlayingPhase(players);

    // Verify each player can see their own cards
    for (const player of players) {
      const cards = player.page.locator('[data-testid^="card-"]');
      const count = await cards.count();
      expect(count).toBeGreaterThan(0);

      // Verify cards are visible (not off-screen)
      const firstCard = cards.first();
      await expect(firstCard).toBeVisible();
    }

    await players[0].page.screenshot({
      path: 'test-results/visual/layout-cards-visible.png',
      fullPage: true,
    });
  });

  test('game status shows during play', async ({ players }) => {
    test.setTimeout(120_000);

    await setupFullGame(players, { seed: SEEDS.layout });
    await doQuickBidding(players);
    await doQuickTrumpSelection(players, 'hearts');
    await skipDoublePhase(players);
    await waitForPlayingPhase(players);

    // Verify game status is visible
    await expect(players[0].page.getByTestId('game-status')).toBeVisible();

    await players[0].page.screenshot({
      path: 'test-results/visual/layout-game-status.png',
      fullPage: true,
    });
  });
});

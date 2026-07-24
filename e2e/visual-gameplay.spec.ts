import { test, expect } from './fixtures';
import { setupFullGame, advanceToPlaying, playCurrentTurn, playTrick } from './helpers';

const SEEDS = {
  gameplay: '10003',
};

test.describe('@visual Card Play', () => {
  test('cards animate from hand to table', async ({ players }) => {
    test.setTimeout(120_000);

    await setupFullGame(players, { seed: SEEDS.gameplay });
    await advanceToPlaying(players, 'hearts');

    // Take screenshot before playing
    await players[0].page.screenshot({
      path: 'test-results/visual/gameplay-before-play.png',
      fullPage: true,
    });

    // Play a card
    await playCurrentTurn(players);

    // Take screenshot after playing
    await players[0].page.screenshot({
      path: 'test-results/visual/gameplay-after-play.png',
      fullPage: true,
    });

    // Verify game board is visible
    await expect(players[0].page.getByTestId('game-board')).toBeVisible();
  });

  test('trick area shows played cards', async ({ players }) => {
    test.setTimeout(180_000);

    await setupFullGame(players, { seed: SEEDS.gameplay });
    await advanceToPlaying(players, 'hearts');

    // Play a full trick (4 cards)
    await playTrick(players);

    // Take screenshot showing completed trick
    await players[0].page.screenshot({
      path: 'test-results/visual/gameplay-completed-trick.png',
      fullPage: true,
    });

    // Verify game board is visible
    await expect(players[0].page.getByTestId('game-board')).toBeVisible();
  });

  test('card fan effect during play', async ({ players }) => {
    test.setTimeout(120_000);

    await setupFullGame(players, { seed: SEEDS.gameplay });
    await advanceToPlaying(players, 'hearts');

    // Verify each player has cards in hand
    for (const player of players) {
      const cards = player.page.locator('[data-testid^="card-"]');
      const count = await cards.count();
      expect(count).toBeGreaterThan(0);
    }

    // Take screenshot showing fan effect
    await players[0].page.screenshot({
      path: 'test-results/visual/gameplay-fan-effect.png',
      fullPage: true,
    });
  });
});

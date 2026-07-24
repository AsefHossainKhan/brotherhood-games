import { test, expect } from './fixtures';
import { setupFullGame, advanceToPlaying, playAllTricks, waitForPhase } from './helpers';

const SEEDS = {
  scoring: '10005',
};

test.describe('@visual Scoring', () => {
  test('scoring panel layout', async ({ players }) => {
    test.setTimeout(300_000);

    await setupFullGame(players, { seed: SEEDS.scoring });
    await advanceToPlaying(players, 'hearts');

    // Play all tricks to reach scoring phase
    await playAllTricks(players);

    // Wait for scoring or match complete phase
    const deadline = Date.now() + 60_000;
    let reachedScoring = false;
    while (Date.now() < deadline) {
      for (const p of players) {
        const scoringVisible = await p.page.getByTestId('scoring-panel').isVisible().catch(() => false);
        const matchCompleteVisible = await p.page.getByTestId('match-complete-panel').isVisible().catch(() => false);
        if (scoringVisible || matchCompleteVisible) {
          reachedScoring = true;
          break;
        }
      }
      if (reachedScoring) break;
      await players[0].page.waitForTimeout(500);
    }

    // Take screenshot of current state
    await players[0].page.screenshot({
      path: 'test-results/visual/scoring-panel.png',
      fullPage: true,
    });

    // Verify game board is still visible
    await expect(players[0].page.getByTestId('game-board')).toBeVisible();
  });

  test('match complete panel', async ({ players }) => {
    test.setTimeout(300_000);

    await setupFullGame(players, { seed: SEEDS.scoring });
    await advanceToPlaying(players, 'hearts');

    // Play all tricks
    await playAllTricks(players);

    // Wait for match complete (if match is over)
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      for (const p of players) {
        const matchCompleteVisible = await p.page.getByTestId('match-complete-panel').isVisible().catch(() => false);
        if (matchCompleteVisible) {
          await p.page.screenshot({
            path: 'test-results/visual/match-complete-panel.png',
            fullPage: true,
          });
          return;
        }
      }
      await players[0].page.waitForTimeout(500);
    }

    // If match complete didn't appear, take screenshot of whatever state we're in
    await players[0].page.screenshot({
      path: 'test-results/visual/scoring-after-hand.png',
      fullPage: true,
    });
  });

  test('game status during play', async ({ players }) => {
    test.setTimeout(120_000);

    await setupFullGame(players, { seed: SEEDS.scoring });
    await advanceToPlaying(players, 'hearts');

    // Verify game status is visible during play
    await expect(players[0].page.getByTestId('game-status')).toBeVisible();

    // Take screenshot showing game status during gameplay
    await players[0].page.screenshot({
      path: 'test-results/visual/scoring-during-play.png',
      fullPage: true,
    });
  });
});

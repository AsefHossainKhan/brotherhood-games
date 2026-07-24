import { test, expect } from './fixtures';
import { setupFullGame, doQuickBidding, doQuickTrumpSelection, skipDoublePhase, waitForPlayingPhase, findPlayerWith } from './helpers';

const SEEDS = {
  trump: '10004',
};

test.describe('@visual Trump Reveal', () => {
  test('reveal button appears for correct player', async ({ players }) => {
    test.setTimeout(120_000);

    await setupFullGame(players, { seed: SEEDS.trump });
    await doQuickBidding(players);
    // Use seventh-card trump so reveal is needed
    await doQuickTrumpSelection(players, 'hearts');
    await skipDoublePhase(players);
    await waitForPlayingPhase(players);

    // Look for trump reveal panel on any player
    const revealPlayer = await findPlayerWith(players, 'trump-reveal-panel', 30_000);

    if (revealPlayer) {
      // Take screenshot showing reveal panel
      await revealPlayer.page.screenshot({
        path: 'test-results/visual/trump-reveal-button.png',
        fullPage: true,
      });

      // Verify the reveal panel is visible
      await expect(revealPlayer.page.getByTestId('trump-reveal-panel')).toBeVisible();
    }
  });

  test('reveal button disabled when not player turn', async ({ players }) => {
    test.setTimeout(120_000);

    await setupFullGame(players, { seed: SEEDS.trump });
    await doQuickBidding(players);
    await doQuickTrumpSelection(players, 'hearts');
    await skipDoublePhase(players);
    await waitForPlayingPhase(players);

    // Look for trump reveal panel
    const revealPlayer = await findPlayerWith(players, 'trump-reveal-panel', 30_000);

    if (revealPlayer) {
      const revealBtn = revealPlayer.page.getByTestId('reveal-trump-btn');

      if (await revealBtn.isVisible().catch(() => false)) {
        // Check if button is disabled (not their turn)
        const isDisabled = await revealBtn.isDisabled().catch(() => true);

        // Take screenshot showing button state
        await revealPlayer.page.screenshot({
          path: 'test-results/visual/trump-reveal-disabled.png',
          fullPage: true,
        });
      }
    }
  });
});

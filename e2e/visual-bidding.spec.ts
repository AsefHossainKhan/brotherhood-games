import { test, expect } from './fixtures';
import { setupFullGame, doQuickBidding, waitForActiveBidder } from './helpers';

const SEEDS = {
  bidding: '10002',
};

test.describe('@visual Bidding Flow', () => {
  test('bid panel appears correctly for active bidder', async ({ players }) => {
    test.setTimeout(120_000);

    await setupFullGame(players, { seed: SEEDS.bidding });

    // Wait for bidding to start and find the active bidder
    // doQuickBidding waits for bidding phase internally, but we want to inspect before bidding
    // So we poll for the bid panel instead
    const deadline = Date.now() + 30_000;
    let bidder = null;
    while (Date.now() < deadline) {
      bidder = await waitForActiveBidder(players).catch(() => null);
      if (bidder) break;
      await players[0].page.waitForTimeout(500);
    }
    expect(bidder).not.toBeNull();

    // Verify bid panel is visible for the active bidder
    await expect(bidder!.page.getByTestId('bid-panel').first()).toBeVisible();

    // Verify bid buttons are present
    await expect(bidder!.page.getByTestId('place-bid-btn')).toBeVisible();
    await expect(bidder!.page.getByTestId('pass-bid-btn')).toBeVisible();

    // Take screenshot of bidding state
    await bidder!.page.screenshot({
      path: 'test-results/visual/bidding-panel.png',
      fullPage: true,
    });

    // Verify other players don't see the bid panel
    for (const player of players) {
      if (player !== bidder) {
        await expect(player.page.getByTestId('bid-panel').first()).not.toBeVisible();
      }
    }
  });

  test('turn indicator shows on active bidder', async ({ players }) => {
    test.setTimeout(120_000);

    await setupFullGame(players, { seed: SEEDS.bidding });

    // Wait for bidding to start
    const deadline = Date.now() + 30_000;
    let bidder = null;
    while (Date.now() < deadline) {
      bidder = await waitForActiveBidder(players).catch(() => null);
      if (bidder) break;
      await players[0].page.waitForTimeout(500);
    }
    expect(bidder).not.toBeNull();

    // Verify "Your turn" text is visible for the active bidder
    await expect(bidder!.page.getByText('Your turn')).toBeVisible();

    // Take screenshot showing turn indicator
    await bidder!.page.screenshot({
      path: 'test-results/visual/bidding-turn-indicator.png',
      fullPage: true,
    });
  });

  test('non-active bidders see disabled buttons', async ({ players }) => {
    test.setTimeout(120_000);

    await setupFullGame(players, { seed: SEEDS.bidding });

    // Wait for bidding to start
    const deadline = Date.now() + 30_000;
    let bidder = null;
    while (Date.now() < deadline) {
      bidder = await waitForActiveBidder(players).catch(() => null);
      if (bidder) break;
      await players[0].page.waitForTimeout(500);
    }
    expect(bidder).not.toBeNull();

    // Verify other players have disabled bid buttons
    for (const player of players) {
      if (player !== bidder) {
        const placeBidBtn = player.page.getByTestId('place-bid-btn');
        const passBidBtn = player.page.getByTestId('pass-bid-btn');

        // These buttons should either not exist or be disabled
        const placeBidVisible = await placeBidBtn.isVisible().catch(() => false);
        const passBidVisible = await passBidBtn.isVisible().catch(() => false);

        if (placeBidVisible) {
          await expect(placeBidBtn).toBeDisabled();
        }
        if (passBidVisible) {
          await expect(passBidBtn).toBeDisabled();
        }
      }
    }
  });
});

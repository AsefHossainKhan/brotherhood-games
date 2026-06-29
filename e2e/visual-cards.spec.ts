import { test, expect } from './fixtures';

const BASE_URL = 'http://localhost:3000';

test('visual: card rendering in game', async ({ players }) => {
  // Setup all players
  for (const player of players) {
    const { page, username } = player;
    await page.goto(BASE_URL);
    await expect(page.locator('text=Connected')).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('username-input').fill(username);
  }

  // Player 0 creates room
  await players[0].page.getByTestId('create-room-btn').click();
  await expect(players[0].page.locator('text=Waiting Room')).toBeVisible({ timeout: 10_000 });
  const roomCode = await players[0].page.getByTestId('room-code').textContent();

  // Players 1-3 join
  for (let i = 1; i < 4; i++) {
    const { page } = players[i];
    await page.getByTestId('join-code-input').fill(roomCode!);
    await page.getByTestId('join-room-btn').click();
    await expect(page.locator('text=Waiting Room')).toBeVisible({ timeout: 10_000 });
  }

  // Wait for all players visible
  await expect(players[0].page.getByTestId('start-game-btn')).toBeEnabled({ timeout: 10_000 });

  // Start game
  await players[0].page.getByTestId('start-game-btn').click();

  // Wait for game board
  for (const player of players) {
    await expect(player.page.getByTestId('game-board')).toBeVisible({ timeout: 15_000 });
  }

  // Take screenshots of each player's view
  for (let i = 0; i < players.length; i++) {
    await players[i].page.screenshot({
      path: `test-results/visual-player-${i}.png`,
      fullPage: true,
    });
  }
});

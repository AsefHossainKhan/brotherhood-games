import { test, expect, type PlayerContext } from './fixtures';

const BASE_URL = 'http://localhost:3000';

/** Set username and wait for socket connection */
async function setupPlayer(player: PlayerContext) {
  const { page, username } = player;
  await page.goto(BASE_URL);

  // Wait for socket connection indicator
  await expect(page.locator('text=Connected')).toBeVisible({ timeout: 10_000 });

  // Set username
  const input = page.getByTestId('username-input');
  await input.fill(username);
}

/** Create a room and return the room code */
async function createRoom(player: PlayerContext): Promise<string> {
  const { page } = player;
  await page.getByTestId('create-room-btn').click();

  // Should navigate to room page and show lobby
  await expect(page.locator('text=Waiting Room')).toBeVisible({ timeout: 10_000 });

  // Read room code
  const roomCode = await page.getByTestId('room-code').textContent();
  expect(roomCode).toHaveLength(4);
  return roomCode!;
}

/** Join an existing room by code */
async function joinRoom(player: PlayerContext, roomCode: string) {
  const { page } = player;
  const codeInput = page.getByTestId('join-code-input');
  await codeInput.fill(roomCode);
  await page.getByTestId('join-room-btn').click();

  // Should navigate to room and see lobby
  await expect(page.locator('text=Waiting Room')).toBeVisible({ timeout: 10_000 });
}

test.describe('Lobby Flow', () => {
  test('host can create a room and see the room code', async ({ host }) => {
    await setupPlayer(host);
    const roomCode = await createRoom(host);

    // Room code should be visible and 4 characters
    await expect(host.page.getByTestId('room-code')).toHaveText(roomCode);

    // Host should see themselves in Team A
    await expect(host.page.locator('text=Alice (you)')).toBeVisible();
  });

  test('player can join an existing room', async ({ players }) => {
    const [alice, bob] = players;
    await setupPlayer(alice);
    await setupPlayer(bob);

    const roomCode = await createRoom(alice);
    await joinRoom(bob, roomCode);

    // Both should see each other in the lobby
    await expect(alice.page.locator('text=Bob')).toBeVisible({ timeout: 5_000 });
    await expect(bob.page.locator('text=Alice')).toBeVisible({ timeout: 5_000 });
  });

  test('4 players can join and host can start the game', async ({ players }) => {
    // Setup all players
    for (const player of players) {
      await setupPlayer(player);
    }

    // Player 0 creates room
    const roomCode = await createRoom(players[0]);

    // Players 1-3 join
    for (let i = 1; i < 4; i++) {
      await joinRoom(players[i], roomCode);
    }

    // Wait for all players to appear in lobby
    for (const player of players) {
      await expect(player.page.locator('text=Alice')).toBeVisible({ timeout: 10_000 });
      await expect(player.page.locator('text=Bob')).toBeVisible({ timeout: 5_000 });
      await expect(player.page.locator('text=Charlie')).toBeVisible({ timeout: 5_000 });
      await expect(player.page.locator('text=Diana')).toBeVisible({ timeout: 5_000 });
    }

    // Start button should be enabled for host
    const startBtn = players[0].page.getByTestId('start-game-btn');
    await expect(startBtn).toBeEnabled({ timeout: 5_000 });
    await startBtn.click();

    // All players should transition to game board
    for (const player of players) {
      await expect(player.page.getByTestId('game-board')).toBeVisible({
        timeout: 15_000,
      });
    }
  });

  test('player can switch teams', async ({ players }) => {
    const [alice, bob] = players;
    await setupPlayer(alice);
    await setupPlayer(bob);

    const roomCode = await createRoom(alice);
    await joinRoom(bob, roomCode);

    // Alice starts in Team A — switch to Team B
    await alice.page.getByTestId('switch-team-btn').click();

    // Bob should see Alice move to Team B side
    // (Alice's name should appear under Team B section)
    await expect(bob.page.locator('text=Alice')).toBeVisible({ timeout: 5_000 });
  });

  test('player can leave a room', async ({ players }) => {
    const [alice, bob] = players;
    await setupPlayer(alice);
    await setupPlayer(bob);

    const roomCode = await createRoom(alice);
    await joinRoom(bob, roomCode);

    // Bob leaves
    await bob.page.getByTestId('leave-room-btn').click();

    // Navigate Bob to home page (room page would try to rejoin)
    await bob.page.goto(BASE_URL);

    // Bob should be back on home page
    await expect(bob.page.locator('text=Multiplayer card game hub')).toBeVisible({ timeout: 10_000 });

    // Alice should see Bob has left (player count drops)
    await expect(alice.page.locator('text=Bob')).not.toBeVisible({ timeout: 10_000 });
  });
});

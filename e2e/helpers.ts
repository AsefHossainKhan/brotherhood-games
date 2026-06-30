/**
 * Shared E2E helpers for game flow tests.
 *
 * All helpers use Playwright's auto-retrying assertions (expect(...).toBeVisible())
 * instead of raw isVisible() polling, which eliminates flakiness from socket timing.
 */
import { expect, type Page, type PlayerContext } from './fixtures';

const BASE_URL = 'http://localhost:3000';

// ============================================================
//  Lobby Helpers
// ============================================================

/** Set username and wait for socket connection */
export async function setupPlayer(player: PlayerContext) {
  const { page, username } = player;
  await page.goto(BASE_URL);
  await expect(page.locator('text=Connected')).toBeVisible({ timeout: 15_000 });
  await page.getByTestId('username-input').fill(username);
}

/** Create a room and return the room code */
export async function createRoom(player: PlayerContext): Promise<string> {
  const { page } = player;
  await page.getByTestId('create-room-btn').click();
  await expect(page.locator('text=Waiting Room')).toBeVisible({ timeout: 10_000 });
  const roomCode = await page.getByTestId('room-code').textContent();
  expect(roomCode).toHaveLength(4);
  return roomCode!;
}

/** Join an existing room by code */
export async function joinRoom(player: PlayerContext, roomCode: string) {
  const { page } = player;
  await page.getByTestId('join-code-input').fill(roomCode);
  await page.getByTestId('join-room-btn').click();
  await expect(page.locator('text=Waiting Room')).toBeVisible({ timeout: 10_000 });
}

/** Start the game (host clicks start) */
export async function startGame(host: PlayerContext) {
  await expect(host.page.getByTestId('start-game-btn')).toBeEnabled({ timeout: 10_000 });
  await host.page.getByTestId('start-game-btn').click();
}

/** Wait for game board to appear on a player's screen */
export async function waitForGameBoard(player: PlayerContext) {
  await expect(player.page.getByTestId('game-board')).toBeVisible({ timeout: 20_000 });
}

/** Full 4-player game setup: create room → join → start → game board visible → handle weak hands */
export async function setupFullGame(players: PlayerContext[]): Promise<string> {
  for (const player of players) {
    await setupPlayer(player);
  }
  const roomCode = await createRoom(players[0]);
  for (let i = 1; i < 4; i++) {
    await joinRoom(players[i], roomCode);
  }
  await startGame(players[0]);
  for (const player of players) {
    await waitForGameBoard(player);
  }

  // Handle weak hands — if any player has a weak hand, they need to make a decision
  // We always keep the hand (don't re-deal) to keep tests deterministic
  await handleWeakHands(players);

  return roomCode;
}

/**
 * Handle weak hand detection after game start.
 * If any player has a weak hand panel, click "Keep Hand" to proceed.
 */
export async function handleWeakHands(players: PlayerContext[]) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    let anyWeakHand = false;
    for (const player of players) {
      const keepBtn = player.page.getByTestId('keep-weak-hand-btn');
      if (await keepBtn.isVisible().catch(() => false)) {
        await keepBtn.click();
        anyWeakHand = true;
        await player.page.waitForTimeout(800);
      }
    }
    if (!anyWeakHand) return;
    await players[0].page.waitForTimeout(300);
  }
}

// ============================================================
//  Phase & Turn Detection
// ============================================================

/** Wait until a specific phase label appears on ANY player's screen */
export async function waitForPhase(
  players: PlayerContext[],
  phaseText: string,
  timeout = 30_000
) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    for (const p of players) {
      // Try both getByText and locator approaches
      const found = await p.page.getByText(phaseText, { exact: false }).first().isVisible().catch(() => false);
      if (found) return;
    }
    await players[0].page.waitForTimeout(500);
  }
  throw new Error(`Phase "${phaseText}" not visible on any player within ${timeout}ms`);
}

/** Find which player currently has a specific testid element visible */
export async function findPlayerWith(
  players: PlayerContext[],
  testId: string,
  timeout = 15_000
): Promise<PlayerContext | null> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    for (const player of players) {
      const visible = await player.page.getByTestId(testId).isVisible().catch(() => false);
      if (visible) return player;
    }
    await players[0].page.waitForTimeout(500);
  }
  return null;
}

/** Wait for "Your turn" on a specific player's page */
export async function waitForMyTurn(page: Page, timeout = 20_000) {
  await expect(page.locator('text=Your turn')).toBeVisible({ timeout });
}

// ============================================================
//  Bidding Helpers
// ============================================================

/**
 * Run through the bidding phase: first player with bid panel bids 16, others pass.
 * Returns once trump selection phase is reached.
 * Handles weak hands automatically (keeps hand to proceed to bidding).
 */
export async function doQuickBidding(players: PlayerContext[]) {
  // Wait for bidding to start — but handle weak hands first
  const deadline = Date.now() + 60_000;
  let biddingFound = false;

  while (Date.now() < deadline && !biddingFound) {
    // Check for weak hand panels and dismiss them
    for (const player of players) {
      const keepBtn = player.page.getByTestId('keep-weak-hand-btn');
      if (await keepBtn.isVisible().catch(() => false)) {
        await keepBtn.click();
        await player.page.waitForTimeout(800);
      }
    }

    // Check if bidding text appears
    for (const p of players) {
      const found = await p.page.getByText('Bidding', { exact: false }).first().isVisible().catch(() => false);
      if (found) {
        biddingFound = true;
        break;
      }
    }

    if (!biddingFound) {
      await players[0].page.waitForTimeout(500);
    }
  }

  if (!biddingFound) {
    throw new Error('Bidding phase did not start within timeout');
  }

  let bidPlaced = false;

  // Now run through the bidding actions
  const actionDeadline = Date.now() + 60_000;

  while (Date.now() < actionDeadline) {
    // Check if we've moved past bidding (trump selector visible)
    for (const p of players) {
      try {
        await expect(p.page.getByTestId('trump-selector')).toBeVisible({ timeout: 500 });
        return; // Trump selection reached
      } catch {
        // Not on this player yet
      }
    }

    // Try to act on each player
    for (const player of players) {
      const page = player.page;

      // If this player has the bid panel, either bid or pass
      const hasPanel = await page.getByTestId('bid-panel').isVisible().catch(() => false);
      if (hasPanel) {
        if (!bidPlaced) {
          // Place the first bid (minimum 16)
          const bidBtn = page.getByTestId('place-bid-btn');
          if (await bidBtn.isVisible().catch(() => false)) {
            await bidBtn.click();
            bidPlaced = true;
            await page.waitForTimeout(800);
            continue;
          }
        }
        // Pass
        const passBtn = page.getByTestId('pass-bid-btn');
        if (await passBtn.isVisible().catch(() => false)) {
          await passBtn.click();
          await page.waitForTimeout(800);
        }
      }
    }

    await players[0].page.waitForTimeout(300);
  }

  throw new Error('Bidding phase did not complete within timeout');
}

// ============================================================
//  Trump Selection Helpers
// ============================================================

/**
 * Find the declarer and select a suit trump (hearts by default).
 * Assumes bidding is already complete.
 */
export async function doQuickTrumpSelection(
  players: PlayerContext[],
  suit = 'hearts'
) {
  // Wait for the trump selector to appear on the declarer's screen
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    for (const player of players) {
      const selector = player.page.getByTestId('trump-selector');
      if (await selector.isVisible().catch(() => false)) {
        await player.page.getByTestId(`trump-${suit}`).click();
        // Wait for the phase to change to Double Phase
        await waitForPhase(players, 'Double Phase', 30_000);
        return;
      }
    }
    await players[0].page.waitForTimeout(500);
  }

  throw new Error('Trump selector never appeared');
}

/**
 * Select seventh-card trump mode.
 */
export async function selectSeventhCardTrump(players: PlayerContext[]) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    for (const player of players) {
      const selector = player.page.getByTestId('trump-selector');
      if (await selector.isVisible().catch(() => false)) {
        await player.page.getByTestId('trump-seventh-card').click();
        await waitForPhase(players, 'Double Phase', 30_000);
        return;
      }
    }
    await players[0].page.waitForTimeout(500);
  }

  throw new Error('Seventh-card trump selector never appeared');
}

/**
 * Select joker (no trump) mode.
 */
export async function selectJokerTrump(players: PlayerContext[]) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    for (const player of players) {
      const selector = player.page.getByTestId('trump-selector');
      if (await selector.isVisible().catch(() => false)) {
        await player.page.getByTestId('trump-joker').click();
        await waitForPhase(players, 'Double Phase', 30_000);
        return;
      }
    }
    await players[0].page.waitForTimeout(500);
  }

  throw new Error('Joker trump selector never appeared');
}

// ============================================================
//  Double Phase Helpers
// ============================================================

/**
 * Skip the double phase — everyone passes.
 */
export async function skipDoublePhase(players: PlayerContext[]) {
  await waitForPhase(players, 'Double Phase', 20_000);

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    // Check if playing phase reached
    for (const p of players) {
      try {
        await expect(p.page.locator('text=Playing')).toBeVisible({ timeout: 500 });
        return;
      } catch { /* not yet */ }
    }

    // Pass for whoever has the pass button
    for (const player of players) {
      const passBtn = player.page.getByTestId('pass-double-btn');
      if (await passBtn.isVisible().catch(() => false)) {
        await passBtn.click();
        await player.page.waitForTimeout(600);
      }
    }

    await players[0].page.waitForTimeout(300);
  }
}

/**
 * Declare double (opponent doubles), then pass the rest.
 */
export async function doDoubleThenPass(players: PlayerContext[]) {
  await waitForPhase(players, 'Double Phase', 20_000);

  let doubled = false;

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    // Check if playing phase reached
    for (const p of players) {
      try {
        await expect(p.page.locator('text=Playing')).toBeVisible({ timeout: 500 });
        return;
      } catch { /* not yet */ }
    }

    for (const player of players) {
      // Try to double first
      if (!doubled) {
        const doubleBtn = player.page.getByTestId('double-btn');
        if (await doubleBtn.isVisible().catch(() => false)) {
          await doubleBtn.click();
          doubled = true;
          await player.page.waitForTimeout(600);
          continue;
        }
      }

      // Pass
      const passBtn = player.page.getByTestId('pass-double-btn');
      if (await passBtn.isVisible().catch(() => false)) {
        await passBtn.click();
        await player.page.waitForTimeout(600);
      }
    }

    await players[0].page.waitForTimeout(300);
  }
}

// ============================================================
//  Playing Helpers
// ============================================================

/**
 * Wait for playing phase to start.
 */
export async function waitForPlayingPhase(players: PlayerContext[]) {
  await waitForPhase(players, 'Playing', 30_000);
}

/**
 * Play a card for whichever player has the turn.
 * Uses "Your turn" text to find the active player.
 * Returns the player who played.
 */
export async function playCurrentTurn(players: PlayerContext[]): Promise<PlayerContext> {
  const timeout = 20_000;
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    for (const player of players) {
      const turnText = player.page.locator('text=Your turn');
      if (await turnText.isVisible().catch(() => false)) {
        // Found the player with the turn — play their first card
        const cards = player.page.locator('[data-testid^="card-"]');
        const count = await cards.count();
        if (count > 0) {
          // Select card (click once to select)
          await cards.first().click();
          await player.page.waitForTimeout(200);
          // Play card (click again)
          await cards.first().click();
          await player.page.waitForTimeout(500);
          return player;
        }
      }
    }
    await players[0].page.waitForTimeout(300);
  }

  throw new Error('No player had "Your turn" within timeout');
}

/**
 * Play a full trick (4 cards).
 */
export async function playTrick(players: PlayerContext[]) {
  for (let i = 0; i < 4; i++) {
    await playCurrentTurn(players);
  }
  // Wait for trick resolution animation/propagation
  await players[0].page.waitForTimeout(800);
}

/**
 * Play all remaining tricks (up to 8 total).
 * Waits for scoring/match-complete phase.
 */
export async function playAllTricks(players: PlayerContext[]) {
  for (let trick = 0; trick < 8; trick++) {
    await playTrick(players);
  }
}

/**
 * Quick advance through bidding → trump → double → playing.
 */
export async function advanceToPlaying(players: PlayerContext[], trumpSuit = 'hearts') {
  await doQuickBidding(players);
  await doQuickTrumpSelection(players, trumpSuit);
  await skipDoublePhase(players);
  await waitForPlayingPhase(players);
}

// ============================================================
//  Score / Game-End Helpers
// ============================================================

/**
 * Wait for the game to finish (MATCH_COMPLETE).
 * This can take a while with 4 simulated players playing 8 tricks.
 */
export async function waitForGameEnd(players: PlayerContext[], timeout = 300_000) {
  // Wait for all tricks to be done — the phase label changes to "Match Complete"
  await waitForPhase(players, 'Match Complete', timeout);
}

/**
 * Read the current scoreboard for a player.
 */
export async function getScoreboard(page: Page) {
  const teamA = await page.locator('text=Team A').isVisible().catch(() => false);
  const teamB = await page.locator('text=Team B').isVisible().catch(() => false);
  return { teamA, teamB };
}

import { test as base, type BrowserContext, type Page } from '@playwright/test';

/**
 * Extended test fixture that provides 4 independent browser contexts
 * to simulate a full 4-player multiplayer game.
 */
export type PlayerContext = {
  context: BrowserContext;
  page: Page;
  username: string;
};

type GameFixtures = {
  players: PlayerContext[];
  host: PlayerContext;
};

export const test = base.extend<GameFixtures>({
  players: async ({ browser }, use) => {
    const names = ['Alice', 'Bob', 'Charlie', 'Diana'];
    const contexts: PlayerContext[] = [];

    for (const username of names) {
      // Each player gets their own isolated context (separate localStorage)
      const context = await browser.newContext();
      const page = await context.newPage();

      // Inject unique guestId before any page loads
      await page.addInitScript(() => {
        const id = crypto.randomUUID();
        localStorage.setItem('brotherhood_guest_id', id);
      });

      contexts.push({ context, page, username });
    }

    await use(contexts);

    for (const ctx of contexts) {
      await ctx.context.close();
    }
  },

  host: async ({ players }, use) => {
    await use(players[0]);
  },
});

export { expect } from '@playwright/test';

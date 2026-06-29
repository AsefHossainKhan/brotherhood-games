// Card suits
export const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
export type Suit = (typeof SUITS)[number];

// Card ranks for 32-card deck (29 game) and 52-card deck (poker etc.)
export const RANKS_32 = ['J', '9', 'A', '10', 'K', 'Q', '8', '7'] as const;
export const RANKS_52 = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'] as const;
export type Rank32 = (typeof RANKS_32)[number];
export type Rank52 = (typeof RANKS_52)[number];
export type Rank = Rank32 | Rank52;

// A card
export interface Card {
  suit: Suit;
  rank: Rank;
}

// Card with a unique id (for tracking played cards)
export interface CardWithId extends Card {
  id: string;
}

// Create a card id from suit+rank
export function cardId(card: Card): string {
  return `${card.suit}_${card.rank}`;
}

// Parse a card id back to suit+rank
export function parseCardId(id: string): Card {
  const [suit, rank] = id.split('_');
  return { suit: suit as Suit, rank: rank as Rank };
}

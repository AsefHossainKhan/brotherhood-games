import type { GameEngine, GameAction, ActionResult, Broadcast, VisibilityRole } from '@brotherhood/game-engine';
import type { RoomSettings } from '@brotherhood/shared';
import type {
  TwentyNineState,
  TwentyNinePlayer,
  Trick,
  BidInfo,
  TrumpInfo,
  DoubleInfo,
  DoubleLevel,
  MatchScore,
} from './types';
import { buildDeck, shuffleDeck } from './logic/deck';
import { firstDeal, secondDeal, canCancelWeakHand } from './logic/dealing';
import { resolveTrick, isValidPlay, getTrickPoints } from './logic/tricks';
import {
  selectSuitTrump,
  selectSeventhCardTrump,
  selectJoker,
  revealTrump,
  canRevealTrump,
  shouldCancelForHiddenTrump,
} from './logic/trump';
import {
  detectMarriage,
  calculateEffectiveBid,
} from './logic/marriage';
import {
  canDeclareDouble,
  getMultiplier,
  calculateTeamPoints,
  didDeclarerSucceed,
  calculateMatchPoints,
  updateScore,
  checkSetCompletion,
} from './logic/scoring';
import { TWENTY_NINE_DEFAULTS } from './config';
import { GAME_PHASES } from '@brotherhood/shared';
import type { GamePhase } from '@brotherhood/shared';

export class TwentyNineEngine implements GameEngine<TwentyNineState> {
  readonly gameType = 'twenty-nine' as const;

  createInitialState(playerIds: string[], settings: RoomSettings, teams?: (0 | 1)[]): TwentyNineState {
    const players: TwentyNinePlayer[] = playerIds.map((id, seat) => ({
      id,
      seat,
      team: teams?.[seat] ?? (seat % 2) as 0 | 1, // Use provided teams or fallback to seat-based
      hand: [],
      isDealer: seat === 0, // First player is initial dealer
      isDeclarer: false,
      isConnected: true,
    }));

    return {
      phase: GAME_PHASES.WAITING_FOR_PLAYERS,
      players,
      deck: [],
      dealCount: 0,
      bidding: {
        currentBid: null,
        currentBidder: null,
        highestBid: null,
        highestBidder: null,
        bids: [],
        passCount: 0,
      },
      dealerSeat: 0,
      trump: {
        type: null,
        suit: null,
        isRevealed: false,
        seventhCard: null,
        revealedBy: null,
      },
      double: {
        level: 'normal',
        calledBy: null,
        multiplier: 1,
      },
      currentTrick: {
        plays: [],
        leadSuit: null,
        winnerId: null,
        trickNumber: 0,
      },
      completedTricks: [],
      currentTurn: -1,
      leadSuit: null,
      marriage: null,
      score: {
        teamPoints: [0, 0],
        matchPoints: [0, 0],
        sets: [0, 0],
        lastBidResult: null,
      },
      weakHandPlayer: null,
      weakHandRequested: false,
      settings: {
        minBid: settings.minBid ?? TWENTY_NINE_DEFAULTS.minBid,
        setThreshold: settings.setThreshold ?? TWENTY_NINE_DEFAULTS.setThreshold,
        matchLength: settings.matchLength ?? TWENTY_NINE_DEFAULTS.matchLength,
      },
      matchId: '',
      startedAt: Date.now(),
    };
  }

  handleAction(state: TwentyNineState, action: GameAction): ActionResult<TwentyNineState> {
    const newState = this.cloneState(state);
    const broadcasts: Broadcast[] = [];

    switch (action.type) {
      case 'START_GAME':
        return this.handleStartGame(newState, broadcasts);
      case 'CANCEL_WEAK_HAND':
        return this.handleCancelWeakHand(newState, action.playerId, broadcasts);
      case 'PLACE_BID':
        return this.handlePlaceBid(newState, action.playerId, action.payload.bid as number, broadcasts);
      case 'PASS_BID':
        return this.handlePassBid(newState, action.playerId, broadcasts);
      case 'SELECT_TRUMP':
        return this.handleSelectTrump(newState, action.playerId, action.payload.suit as string, broadcasts);
      case 'SELECT_SEVENTH_CARD_TRUMP':
        return this.handleSelectSeventhCardTrump(newState, action.playerId, broadcasts);
      case 'SELECT_JOKER':
        return this.handleSelectJoker(newState, action.playerId, broadcasts);
      case 'DECLARE_DOUBLE':
        return this.handleDeclareDouble(newState, action.playerId, 'double', broadcasts);
      case 'DECLARE_REDOUBLE':
        return this.handleDeclareDouble(newState, action.playerId, 'redouble', broadcasts);
      case 'DECLARE_FULLSET':
        return this.handleDeclareDouble(newState, action.playerId, 'fullset', broadcasts);
      case 'PLAY_CARD':
        return this.handlePlayCard(newState, action.playerId, action.payload.cardIndex as number, broadcasts);
      case 'REQUEST_TRUMP_REVEAL':
        return this.handleTrumpReveal(newState, action.playerId, broadcasts);
      default:
        return { newState, broadcasts, errors: [{ code: 'UNKNOWN_ACTION', message: `Unknown action: ${action.type}` }] };
    }
  }

  validateAction(state: TwentyNineState, action: GameAction): { valid: boolean; error?: string } {
    switch (action.type) {
      case 'START_GAME':
        return { valid: state.phase === GAME_PHASES.WAITING_FOR_PLAYERS };
      case 'CANCEL_WEAK_HAND':
        return this.validateCancelWeakHand(state, action.playerId);
      case 'PLACE_BID':
        return this.validatePlaceBid(state, action.playerId, action.payload.bid as number);
      case 'PASS_BID':
        return this.validatePassBid(state, action.playerId);
      case 'SELECT_TRUMP':
      case 'SELECT_SEVENTH_CARD_TRUMP':
      case 'SELECT_JOKER':
        return this.validateTrumpSelection(state, action.playerId);
      case 'DECLARE_DOUBLE':
      case 'DECLARE_REDOUBLE':
      case 'DECLARE_FULLSET':
        return this.validateDouble(state, action.playerId, action.type.replace('DECLARE_', '').toLowerCase() as DoubleLevel);
      case 'PLAY_CARD':
        return this.validatePlayCard(state, action.playerId, action.payload.cardIndex as number);
      case 'REQUEST_TRUMP_REVEAL':
        return this.validateTrumpReveal(state, action.playerId);
      default:
        return { valid: false, error: `Unknown action: ${action.type}` };
    }
  }

  getVisibleState(state: TwentyNineState, playerId: string, role: VisibilityRole): Record<string, unknown> {
    const player = state.players.find((p) => p.id === playerId);
    const isDeclarer = player?.isDeclarer ?? false;

    return {
      phase: state.phase,
      players: state.players.map((p) => ({
        id: p.id,
        seat: p.seat,
        team: p.team,
        isDealer: p.isDealer,
        isDeclarer: p.isDeclarer,
        isConnected: p.isConnected,
        handCount: p.hand.length,
        // Only show the player's own hand
        hand: p.id === playerId && role === 'player' ? p.hand : undefined,
      })),
      bidding: state.bidding,
      trump: {
        type: state.trump.type,
        // Hide suit if seventh-card and not revealed (unless you're the declarer)
        suit:
          state.trump.type === 'seventh-card' && !state.trump.isRevealed && !isDeclarer
            ? null
            : state.trump.suit,
        isRevealed: state.trump.isRevealed,
        // Hide seventh card unless you're the declarer
        seventhCard: isDeclarer ? state.trump.seventhCard : null,
      },
      double: state.double,
      currentTrick: state.currentTrick,
      completedTricks: state.completedTricks.map((t) => ({
        trickNumber: t.trickNumber,
        winnerId: t.winnerId,
        cardCount: t.plays.length,
      })),
      currentTurn: state.currentTurn,
      leadSuit: state.leadSuit,
      marriage: state.marriage,
      score: state.score,
      weakHandPlayer: state.weakHandPlayer,
      settings: state.settings,
    };
  }

  getPhase(state: TwentyNineState): string {
    return state.phase;
  }

  isComplete(state: TwentyNineState): boolean {
    return state.phase === GAME_PHASES.MATCH_COMPLETE;
  }

  getCurrentPlayer(state: TwentyNineState): string | null {
    if (state.currentTurn < 0) return null;
    return state.players[state.currentTurn]?.id ?? null;
  }

  handleDisconnect(state: TwentyNineState, playerId: string): ActionResult<TwentyNineState> {
    const newState = this.cloneState(state);
    const player = newState.players.find((p) => p.id === playerId);
    if (player) player.isConnected = false;
    return { newState, broadcasts: [] };
  }

  handleReconnect(state: TwentyNineState, playerId: string): ActionResult<TwentyNineState> {
    const newState = this.cloneState(state);
    const player = newState.players.find((p) => p.id === playerId);
    if (player) player.isConnected = true;
    return { newState, broadcasts: [] };
  }

  // ---- Private Handlers ----

  private handleStartGame(state: TwentyNineState, broadcasts: Broadcast[]): ActionResult<TwentyNineState> {
    // Build and shuffle deck
    state.deck = shuffleDeck(buildDeck());

    // Deal first 4 cards
    const { hands, remaining } = firstDeal(state.deck, 4);
    state.deck = remaining;
    state.dealCount = 4;

    for (let i = 0; i < 4; i++) {
      state.players[i].hand = hands[i];
    }

    state.phase = GAME_PHASES.FIRST_DEAL;

    // Send hands to each player
    for (const player of state.players) {
      broadcasts.push({
        event: 'FIRST_DEAL_COMPLETED',
        payload: { hand: player.hand },
        targetPlayerIds: [player.id],
      });
    }

    // Check for weak hands
    for (const player of state.players) {
      if (canCancelWeakHand(player.hand)) {
        state.weakHandPlayer = player.id;
        broadcasts.push({
          event: 'WEAK_HAND_DETECTED',
          payload: { playerId: player.id },
          targetPlayerIds: [player.id],
        });
        // Don't transition to bidding yet — wait for weak hand decision
        return { newState: state, broadcasts };
      }
    }

    // No weak hand — proceed to bidding
    return this.startBidding(state, broadcasts);
  }

  private handleCancelWeakHand(
    state: TwentyNineState,
    playerId: string,
    broadcasts: Broadcast[]
  ): ActionResult<TwentyNineState> {
    if (state.weakHandPlayer !== playerId) {
      return { newState: state, broadcasts, errors: [{ code: 'NOT_WEAK_HAND_PLAYER', message: 'Not your weak hand decision' }] };
    }

    if (state.weakHandRequested) {
      // Player confirms cancellation — re-deal
      state.deck = shuffleDeck(buildDeck());
      const { hands, remaining } = firstDeal(state.deck, 4);
      state.deck = remaining;
      state.dealCount = 4;

      for (let i = 0; i < 4; i++) {
        state.players[i].hand = hands[i];
      }

      state.weakHandPlayer = null;
      state.weakHandRequested = false;

      broadcasts.push({
        event: 'HANDS_REDEALT',
        payload: {},
      });

      // Send new hands
      for (const player of state.players) {
        broadcasts.push({
          event: 'FIRST_DEAL_COMPLETED',
          payload: { hand: player.hand },
          targetPlayerIds: [player.id],
        });
      }

      // Check for weak hands again
      for (const player of state.players) {
        if (canCancelWeakHand(player.hand)) {
          state.weakHandPlayer = player.id;
          broadcasts.push({
            event: 'WEAK_HAND_DETECTED',
            payload: { playerId: player.id },
            targetPlayerIds: [player.id],
          });
          return { newState: state, broadcasts };
        }
      }

      return this.startBidding(state, broadcasts);
    } else {
      // Player declines cancellation — proceed to bidding
      state.weakHandPlayer = null;
      state.weakHandRequested = false;
      return this.startBidding(state, broadcasts);
    }
  }

  private startBidding(state: TwentyNineState, broadcasts: Broadcast[]): ActionResult<TwentyNineState> {
    state.phase = GAME_PHASES.BIDDING;

    // Bidding starts at dealer's right (counter-clockwise)
    const firstBidderSeat = (state.dealerSeat + 1) % 4;
    state.currentTurn = firstBidderSeat;
    state.bidding = {
      currentBid: null,
      currentBidder: null,
      highestBid: null,
      highestBidder: null,
      bids: [],
      passCount: 0,
    };

    broadcasts.push({
      event: 'BIDDING_STARTED',
      payload: { firstBidder: state.players[firstBidderSeat].id },
    });

    return { newState: state, broadcasts };
  }

  private handlePlaceBid(
    state: TwentyNineState,
    playerId: string,
    bid: number,
    broadcasts: Broadcast[]
  ): ActionResult<TwentyNineState> {
    const player = state.players.find((p) => p.id === playerId);
    if (!player || player.seat !== state.currentTurn) {
      return { newState: state, broadcasts, errors: [{ code: 'NOT_YOUR_TURN', message: 'Not your turn to bid' }] };
    }

    const minBid = state.bidding.highestBid ? state.bidding.highestBid + 1 : state.settings.minBid;
    if (bid < minBid || bid > TWENTY_NINE_DEFAULTS.maxBid) {
      return {
        newState: state,
        broadcasts,
        errors: [{ code: 'INVALID_BID', message: `Bid must be between ${minBid} and ${TWENTY_NINE_DEFAULTS.maxBid}` }],
      };
    }

    state.bidding.bids.push({ playerId, bid });
    state.bidding.currentBid = bid;
    state.bidding.currentBidder = playerId;
    state.bidding.highestBid = bid;
    state.bidding.highestBidder = playerId;

    broadcasts.push({
      event: 'BID_UPDATED',
      payload: {
        playerId,
        bid,
        currentHigh: bid,
        declarer: playerId,
      },
    });

    // Move to next bidder
    return this.advanceBidding(state, broadcasts);
  }

  private handlePassBid(
    state: TwentyNineState,
    playerId: string,
    broadcasts: Broadcast[]
  ): ActionResult<TwentyNineState> {
    const player = state.players.find((p) => p.id === playerId);
    if (!player || player.seat !== state.currentTurn) {
      return { newState: state, broadcasts, errors: [{ code: 'NOT_YOUR_TURN', message: 'Not your turn to bid' }] };
    }

    state.bidding.bids.push({ playerId, bid: null });
    state.bidding.passCount++;

    broadcasts.push({
      event: 'BID_UPDATED',
      payload: {
        playerId,
        bid: null,
        currentHigh: state.bidding.highestBid,
        declarer: state.bidding.highestBidder,
      },
    });

    return this.advanceBidding(state, broadcasts);
  }

  private advanceBidding(
    state: TwentyNineState,
    broadcasts: Broadcast[]
  ): ActionResult<TwentyNineState> {
    // Check if bidding is complete
    // Bidding completes when all 4 players have bid OR 3 have passed and one has bid
    if (state.bidding.passCount >= 3 && state.bidding.highestBidder) {
      // Bidding finished
      return this.finishBidding(state, broadcasts);
    }

    // Move to next bidder (counter-clockwise)
    state.currentTurn = (state.currentTurn + 1) % 4;

    return { newState: state, broadcasts };
  }

  private finishBidding(
    state: TwentyNineState,
    broadcasts: Broadcast[]
  ): ActionResult<TwentyNineState> {
    if (!state.bidding.highestBidder) {
      // All passed — redeal
      broadcasts.push({
        event: 'ALL_PASSED',
        payload: {},
      });
      // Reset and redeal
      state.deck = shuffleDeck(buildDeck());
      const { hands, remaining } = firstDeal(state.deck, 4);
      state.deck = remaining;
      for (let i = 0; i < 4; i++) {
        state.players[i].hand = hands[i];
      }
      return this.startBidding(state, broadcasts);
    }

    const declarerId = state.bidding.highestBidder;
    const declarer = state.players.find((p) => p.id === declarerId)!;
    declarer.isDeclarer = true;

    broadcasts.push({
      event: 'BIDDING_FINISHED',
      payload: {
        declarerId,
        winningBid: state.bidding.highestBid!,
      },
    });

    // Move to trump selection
    state.phase = GAME_PHASES.TRUMP_SELECTION;
    state.currentTurn = declarer.seat;

    return { newState: state, broadcasts };
  }

  private handleSelectTrump(
    state: TwentyNineState,
    playerId: string,
    suit: string,
    broadcasts: Broadcast[]
  ): ActionResult<TwentyNineState> {
    const result = selectSuitTrump(suit as any);
    state.trump = {
      type: 'suit',
      suit: result.suit,
      isRevealed: true,
      seventhCard: null,
      revealedBy: null,
    };

    broadcasts.push({
      event: 'TRUMP_SELECTED',
      payload: { type: 'suit', suit: result.suit },
    });

    return this.proceedToSecondDeal(state, broadcasts);
  }

  private handleSelectSeventhCardTrump(
    state: TwentyNineState,
    playerId: string,
    broadcasts: Broadcast[]
  ): ActionResult<TwentyNineState> {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) {
      return { newState: state, broadcasts, errors: [{ code: 'PLAYER_NOT_FOUND', message: 'Player not found' }] };
    }

    const result = selectSeventhCardTrump(player.hand);
    state.trump = {
      type: 'seventh-card',
      suit: result.suit,
      isRevealed: false,
      seventhCard: result.seventhCard,
      revealedBy: null,
    };

    broadcasts.push({
      event: 'TRUMP_SELECTED',
      payload: { type: 'seventh-card' },
      // Don't reveal the suit to others
    });

    // Tell the declarer the actual trump
    broadcasts.push({
      event: 'TRUMP_HIDDEN',
      payload: { suit: result.suit, seventhCard: result.seventhCard },
      targetPlayerIds: [playerId],
    });

    return this.proceedToSecondDeal(state, broadcasts);
  }

  private handleSelectJoker(
    state: TwentyNineState,
    playerId: string,
    broadcasts: Broadcast[]
  ): ActionResult<TwentyNineState> {
    state.trump = {
      type: 'joker',
      suit: null,
      isRevealed: false,
      seventhCard: null,
      revealedBy: null,
    };

    broadcasts.push({
      event: 'TRUMP_SELECTED',
      payload: { type: 'joker' },
    });

    return this.proceedToSecondDeal(state, broadcasts);
  }

  private proceedToSecondDeal(
    state: TwentyNineState,
    broadcasts: Broadcast[]
  ): ActionResult<TwentyNineState> {
    state.phase = GAME_PHASES.SECOND_DEAL;

    // Deal second 4 cards
    const { hands, remaining } = secondDeal(state.deck, state.players.map((p) => p.hand), 4);
    state.deck = remaining;
    state.dealCount = 8;

    for (let i = 0; i < 4; i++) {
      state.players[i].hand = hands[i];
    }

    // Send updated hands
    for (const player of state.players) {
      broadcasts.push({
        event: 'SECOND_DEAL_COMPLETED',
        payload: { hand: player.hand },
        targetPlayerIds: [player.id],
      });
    }

    // Proceed to double phase
    state.phase = GAME_PHASES.DOUBLE_PHASE;

    // Double phase: opponents of declarer can call double first
    const declarer = state.players.find((p) => p.isDeclarer)!;
    const opponentSeat = (declarer.seat + 1) % 2 === 0
      ? (declarer.seat + 1) % 4
      : (declarer.seat + 2) % 4;

    // For simplicity, any opponent can call double
    // We'll let the first opponent in turn order act
    state.currentTurn = this.getNextOpponentSeat(state, declarer.seat);

    return { newState: state, broadcasts };
  }

  private handleDeclareDouble(
    state: TwentyNineState,
    playerId: string,
    level: DoubleLevel,
    broadcasts: Broadcast[]
  ): ActionResult<TwentyNineState> {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) {
      return { newState: state, broadcasts, errors: [{ code: 'PLAYER_NOT_FOUND', message: 'Player not found' }] };
    }

    const declarer = state.players.find((p) => p.isDeclarer)!;

    if (!canDeclareDouble(level, state.double.level, player.team, declarer.team)) {
      return { newState: state, broadcasts, errors: [{ code: 'INVALID_DOUBLE', message: `Cannot declare ${level}` }] };
    }

    state.double = {
      level,
      calledBy: playerId,
      multiplier: getMultiplier(level),
    };

    broadcasts.push({
      event: `DECLARE_${level.toUpperCase()}`,
      payload: { playerId, level, multiplier: state.double.multiplier },
    });

    // If full set, proceed to playing
    if (level === 'fullset') {
      return this.startPlaying(state, broadcasts);
    }

    // Otherwise, move to next player who can respond
    const nextSeat = level === 'double'
      ? this.getNextTeammateSeat(state, declarer.seat) // Re-double: declarer's team
      : this.getNextOpponentSeat(state, declarer.seat); // Full set: opponents

    state.currentTurn = nextSeat;

    return { newState: state, broadcasts };
  }

  private startPlaying(
    state: TwentyNineState,
    broadcasts: Broadcast[]
  ): ActionResult<TwentyNineState> {
    state.phase = GAME_PHASES.PLAYING;

    // First trick: declarer leads
    const declarer = state.players.find((p) => p.isDeclarer)!;
    state.currentTurn = declarer.seat;
    state.currentTrick = {
      plays: [],
      leadSuit: null,
      winnerId: null,
      trickNumber: 1,
    };

    broadcasts.push({
      event: 'PLAYING_STARTED',
      payload: { firstPlayer: declarer.id },
    });

    return { newState: state, broadcasts };
  }

  private handlePlayCard(
    state: TwentyNineState,
    playerId: string,
    cardIndex: number,
    broadcasts: Broadcast[]
  ): ActionResult<TwentyNineState> {
    const player = state.players.find((p) => p.id === playerId);
    if (!player || player.seat !== state.currentTurn) {
      return { newState: state, broadcasts, errors: [{ code: 'NOT_YOUR_TURN', message: 'Not your turn to play' }] };
    }

    if (cardIndex < 0 || cardIndex >= player.hand.length) {
      return { newState: state, broadcasts, errors: [{ code: 'INVALID_CARD', message: 'Invalid card index' }] };
    }

    const card = player.hand[cardIndex];

    // Validate play (follow suit)
    if (!isValidPlay(player.hand, card, state.leadSuit)) {
      return {
        newState: state,
        broadcasts,
        errors: [{ code: 'MUST_FOLLOW_SUIT', message: 'You must follow suit if possible' }],
      };
    }

    // Play the card
    player.hand.splice(cardIndex, 1);
    state.currentTrick.plays.push({ playerId, card, cardIndex });

    // Set lead suit if this is the first play of the trick
    if (state.currentTrick.plays.length === 1) {
      state.leadSuit = card.suit;
      state.currentTrick.leadSuit = card.suit;
    }

    broadcasts.push({
      event: 'CARD_PLAYED',
      payload: { playerId, cardId: `${card.suit}_${card.rank}` },
    });

    // Check if trick is complete (4 cards played)
    if (state.currentTrick.plays.length === 4) {
      return this.resolveCurrentTrick(state, broadcasts);
    }

    // Move to next player
    state.currentTurn = (state.currentTurn + 1) % 4;

    return { newState: state, broadcasts };
  }

  private resolveCurrentTrick(
    state: TwentyNineState,
    broadcasts: Broadcast[]
  ): ActionResult<TwentyNineState> {
    const { winnerId } = resolveTrick(
      state.currentTrick.plays.map((p) => ({ playerId: p.playerId, card: p.card })),
      state.trump.suit
    );

    state.currentTrick.winnerId = winnerId;
    state.completedTricks.push({ ...state.currentTrick });

    broadcasts.push({
      event: 'TRICK_COMPLETED',
      payload: {
        winnerId,
        cards: state.currentTrick.plays.map((p) => ({
          playerId: p.playerId,
          cardId: `${p.card.suit}_${p.card.rank}`,
        })),
        trickNumber: state.currentTrick.trickNumber,
      },
    });

    // Check if all tricks are played
    if (state.completedTricks.length >= TWENTY_NINE_DEFAULTS.totalTricks) {
      return this.finishGame(state, broadcasts);
    }

    // Next trick: winner leads
    const winner = state.players.find((p) => p.id === winnerId)!;
    state.currentTurn = winner.seat;
    state.leadSuit = null;
    state.currentTrick = {
      plays: [],
      leadSuit: null,
      winnerId: null,
      trickNumber: state.completedTricks.length + 1,
    };

    return { newState: state, broadcasts };
  }

  private handleTrumpReveal(
    state: TwentyNineState,
    playerId: string,
    broadcasts: Broadcast[]
  ): ActionResult<TwentyNineState> {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) {
      return { newState: state, broadcasts, errors: [{ code: 'PLAYER_NOT_FOUND', message: 'Player not found' }] };
    }

    if (!state.trump.suit) {
      return { newState: state, broadcasts, errors: [{ code: 'NO_TRUMP', message: 'No trump to reveal (Joker mode)' }] };
    }

    if (state.trump.isRevealed) {
      return { newState: state, broadcasts, errors: [{ code: 'ALREADY_REVEALED', message: 'Trump already revealed' }] };
    }

    if (!canRevealTrump(player.hand, state.trump.suit)) {
      return {
        newState: state,
        broadcasts,
        errors: [{ code: 'CANNOT_REVEAL', message: 'You do not have any cards of the trump suit' }],
      };
    }

    const result = revealTrump(player.hand, state.trump.suit);
    state.trump.isRevealed = true;
    state.trump.revealedBy = playerId;

    broadcasts.push({
      event: 'TRUMP_REVEALED',
      payload: { suit: state.trump.suit, playerId },
    });

    // Check for marriage
    const marriageSuit = detectMarriage(player.hand, state.trump.suit);
    if (marriageSuit) {
      const declarer = state.players.find((p) => p.isDeclarer)!;
      const effectiveBid = calculateEffectiveBid(
        state.bidding.highestBid!,
        player.team,
        declarer.team
      );

      state.marriage = {
        team: player.team,
        suit: marriageSuit,
        effectiveBid,
      };

      broadcasts.push({
        event: 'MARRIAGE_DECLARED',
        payload: { playerId, suit: marriageSuit, effectiveBid },
      });
    }

    return { newState: state, broadcasts };
  }

  private finishGame(
    state: TwentyNineState,
    broadcasts: Broadcast[]
  ): ActionResult<TwentyNineState> {
    state.phase = GAME_PHASES.SCORING;

    // Check if hidden trump was never revealed
    if (shouldCancelForHiddenTrump(
      state.trump.type!,
      state.trump.isRevealed,
      state.completedTricks.length,
      TWENTY_NINE_DEFAULTS.totalTricks
    )) {
      broadcasts.push({
        event: 'GAME_CANCELLED',
        payload: { reason: 'Hidden trump was never revealed' },
      });
      state.phase = GAME_PHASES.MATCH_COMPLETE;
      return { newState: state, broadcasts };
    }

    // Calculate team points
    const teams = new Map<string, 0 | 1>();
    for (const player of state.players) {
      teams.set(player.id, player.team);
    }

    const completedTricks = state.completedTricks.filter((t) => t.winnerId !== null) as { plays: { playerId: string; card: { suit: string; rank: string } }[]; winnerId: string }[];
    const teamPoints = calculateTeamPoints(completedTricks, teams);

    // Determine effective bid
    const declarer = state.players.find((p) => p.isDeclarer)!;
    const effectiveBid = state.marriage?.effectiveBid ?? state.bidding.highestBid!;

    // Check if declarer succeeded
    const bidSuccess = didDeclarerSucceed(teamPoints[declarer.team], effectiveBid);

    // Calculate match points
    const matchPointsResult = calculateMatchPoints(
      declarer.team,
      bidSuccess,
      state.double.multiplier
    );

    // Update score
    state.score = updateScore(state.score, teamPoints, matchPointsResult, bidSuccess);

    // Check set completion
    const setResult = checkSetCompletion(state.score.matchPoints, state.settings.setThreshold);
    if (setResult.setCompleted && setResult.winner !== null) {
      state.score.sets[setResult.winner]++;
    }

    broadcasts.push({
      event: 'SCORE_UPDATED',
      payload: {
        team1Points: teamPoints[0],
        team2Points: teamPoints[1],
        matchPoints: state.double.multiplier,
        team1Sets: state.score.sets[0],
        team2Sets: state.score.sets[1],
        bidResult: bidSuccess ? 'success' : 'fail',
      },
    });

    // Check if match is complete (a team has won enough sets)
    if (
      state.score.sets[0] >= state.settings.matchLength ||
      state.score.sets[1] >= state.settings.matchLength
    ) {
      state.phase = GAME_PHASES.MATCH_COMPLETE;
      const winner = state.score.sets[0] >= state.settings.matchLength ? 'team1' : 'team2';
      broadcasts.push({
        event: 'GAME_FINISHED',
        payload: { winner, reason: `Team ${winner} won ${state.settings.matchLength} sets` },
      });
    } else {
      // Rotate dealer and start next game
      state.dealerSeat = (state.dealerSeat + 1) % 4;
      for (const p of state.players) {
        p.isDealer = p.seat === state.dealerSeat;
        p.isDeclarer = false;
      }
      state.phase = GAME_PHASES.MATCH_COMPLETE;
    }

    return { newState: state, broadcasts };
  }

  // ---- Validation Helpers ----

  private validateCancelWeakHand(state: TwentyNineState, playerId: string): { valid: boolean; error?: string } {
    if (state.weakHandPlayer !== playerId) return { valid: false, error: 'Not your weak hand decision' };
    return { valid: true };
  }

  private validatePlaceBid(state: TwentyNineState, playerId: string, bid: number): { valid: boolean; error?: string } {
    if (state.phase !== GAME_PHASES.BIDDING) return { valid: false, error: 'Not in bidding phase' };
    const player = state.players.find((p) => p.id === playerId);
    if (!player || player.seat !== state.currentTurn) return { valid: false, error: 'Not your turn' };
    const minBid = state.bidding.highestBid ? state.bidding.highestBid + 1 : state.settings.minBid;
    if (bid < minBid || bid > TWENTY_NINE_DEFAULTS.maxBid) return { valid: false, error: `Bid must be ${minBid}-${TWENTY_NINE_DEFAULTS.maxBid}` };
    return { valid: true };
  }

  private validatePassBid(state: TwentyNineState, playerId: string): { valid: boolean; error?: string } {
    if (state.phase !== GAME_PHASES.BIDDING) return { valid: false, error: 'Not in bidding phase' };
    const player = state.players.find((p) => p.id === playerId);
    if (!player || player.seat !== state.currentTurn) return { valid: false, error: 'Not your turn' };
    return { valid: true };
  }

  private validateTrumpSelection(state: TwentyNineState, playerId: string): { valid: boolean; error?: string } {
    if (state.phase !== GAME_PHASES.TRUMP_SELECTION) return { valid: false, error: 'Not in trump selection phase' };
    const player = state.players.find((p) => p.id === playerId);
    if (!player?.isDeclarer) return { valid: false, error: 'Only declarer can select trump' };
    return { valid: true };
  }

  private validateDouble(state: TwentyNineState, playerId: string, level: DoubleLevel): { valid: boolean; error?: string } {
    if (state.phase !== GAME_PHASES.DOUBLE_PHASE) return { valid: false, error: 'Not in double phase' };
    const player = state.players.find((p) => p.id === playerId);
    if (!player) return { valid: false, error: 'Player not found' };
    const declarer = state.players.find((p) => p.isDeclarer)!;
    if (!canDeclareDouble(level, state.double.level, player.team, declarer.team)) return { valid: false, error: `Cannot declare ${level}` };
    return { valid: true };
  }

  private validatePlayCard(state: TwentyNineState, playerId: string, cardIndex: number): { valid: boolean; error?: string } {
    if (state.phase !== GAME_PHASES.PLAYING) return { valid: false, error: 'Not in playing phase' };
    const player = state.players.find((p) => p.id === playerId);
    if (!player || player.seat !== state.currentTurn) return { valid: false, error: 'Not your turn' };
    if (cardIndex < 0 || cardIndex >= player.hand.length) return { valid: false, error: 'Invalid card index' };

    const card = player.hand[cardIndex];
    if (!isValidPlay(player.hand, card, state.leadSuit)) return { valid: false, error: 'Must follow suit' };
    return { valid: true };
  }

  private validateTrumpReveal(state: TwentyNineState, playerId: string): { valid: boolean; error?: string } {
    if (state.trump.type !== 'seventh-card') return { valid: false, error: 'No hidden trump to reveal' };
    if (state.trump.isRevealed) return { valid: false, error: 'Trump already revealed' };
    const player = state.players.find((p) => p.id === playerId);
    if (!player) return { valid: false, error: 'Player not found' };
    if (!state.trump.suit || !canRevealTrump(player.hand, state.trump.suit)) return { valid: false, error: 'Cannot reveal trump' };
    return { valid: true };
  }

  // ---- Helpers ----

  private getNextOpponentSeat(state: TwentyNineState, declarerSeat: number): number {
    // Opponents are seats that are different team
    const declarerTeam = state.players[declarerSeat].team;
    for (let i = 1; i <= 3; i++) {
      const seat = (declarerSeat + i) % 4;
      if (state.players[seat].team !== declarerTeam) return seat;
    }
    return (declarerSeat + 1) % 4;
  }

  private getNextTeammateSeat(state: TwentyNineState, playerSeat: number): number {
    const playerTeam = state.players[playerSeat].team;
    for (let i = 1; i <= 3; i++) {
      const seat = (playerSeat + i) % 4;
      if (state.players[seat].team === playerTeam) return seat;
    }
    return (playerSeat + 2) % 4;
  }

  private cloneState(state: TwentyNineState): TwentyNineState {
    return JSON.parse(JSON.stringify(state));
  }
}

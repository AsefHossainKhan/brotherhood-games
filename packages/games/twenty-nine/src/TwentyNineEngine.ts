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
  calculateBonusPoints,
  calculateTricksWonPerTeam,
} from './logic/scoring';
import { TWENTY_NINE_DEFAULTS } from './config';
import { GAME_PHASES } from '@brotherhood/shared';
import type { GamePhase } from '@brotherhood/shared';

export class TwentyNineEngine implements GameEngine<TwentyNineState> {
  readonly gameType = 'twenty-nine' as const;

  createInitialState(playerIds: string[], settings: RoomSettings, teams?: (0 | 1)[], usernames?: string[]): TwentyNineState {
    const players: TwentyNinePlayer[] = playerIds.map((id, seat) => ({
      id,
      username: usernames?.[seat] ?? `Player ${seat + 1}`,
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
        mustPlayTrump: false,
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
      case 'KEEP_WEAK_HAND':
        return this.handleKeepWeakHand(newState, action.playerId, broadcasts);
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
      case 'PASS_DOUBLE':
        return this.handlePassDouble(newState, action.playerId, broadcasts);
      case 'PLAY_CARD':
        return this.handlePlayCard(newState, action.playerId, action.payload.cardIndex as number, broadcasts);
      case 'REQUEST_TRUMP_REVEAL':
        return this.handleTrumpReveal(newState, action.playerId, broadcasts);
      case 'START_NEXT_HAND':
        return this.handleStartNextHand(newState, broadcasts);
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
      case 'KEEP_WEAK_HAND':
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
      case 'PASS_DOUBLE':
        return this.validatePassDouble(state, action.playerId);
      case 'PLAY_CARD':
        return this.validatePlayCard(state, action.playerId, action.payload.cardIndex as number);
      case 'REQUEST_TRUMP_REVEAL':
        return this.validateTrumpReveal(state, action.playerId);
      case 'START_NEXT_HAND':
        return this.validateStartNextHand(state);
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
        username: p.username,
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
        // Hide suit from everyone except declarer until revealed
        // For joker (no trump), suit is always null
        suit:
          state.trump.type === 'joker'
            ? null
            : !state.trump.isRevealed && !isDeclarer
            ? null
            : state.trump.suit,
        isRevealed: state.trump.isRevealed,
        // Hide seventh card unless you're the declarer
        seventhCard: isDeclarer ? state.trump.seventhCard : null,
        mustPlayTrump: state.trump.mustPlayTrump && state.trump.revealedBy === playerId,
      },
      double: state.double,
      currentTrick: {
        ...state.currentTrick,
        plays: state.currentTrick.plays.map((p) => ({
          playerId: p.playerId,
          cardId: `${p.card.suit}_${p.card.rank}`,
        })),
      },
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

    // Player requests re-deal
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
  }

  private handleKeepWeakHand(
    state: TwentyNineState,
    playerId: string,
    broadcasts: Broadcast[]
  ): ActionResult<TwentyNineState> {
    if (state.weakHandPlayer !== playerId) {
      return { newState: state, broadcasts, errors: [{ code: 'NOT_WEAK_HAND_PLAYER', message: 'Not your weak hand decision' }] };
    }

    // Player keeps the weak hand — proceed to bidding
    state.weakHandPlayer = null;
    state.weakHandRequested = false;
    return this.startBidding(state, broadcasts);
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
    // Case 1: All 4 players passed — redeal
    if (state.bidding.passCount >= 4) {
      return this.finishBidding(state, broadcasts);
    }

    // Case 2: 3 players passed and one has bid — bidding finished
    if (state.bidding.passCount >= 3 && state.bidding.highestBidder) {
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
      isRevealed: false,
      seventhCard: null,
      revealedBy: null,
      mustPlayTrump: false,
    };

    // Tell the declarer the actual trump (private info)
    broadcasts.push({
      event: 'TRUMP_HIDDEN',
      payload: { suit: result.suit, type: 'suit' },
      targetPlayerIds: [playerId],
    });

    broadcasts.push({
      event: 'TRUMP_SELECTED',
      payload: { type: 'suit' },
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

    // Seventh-card trump: the trump suit is determined by the 7th card
    // in the declarer's FINAL 8-card hand. At this point only 4 cards are
    // dealt, so we defer the actual determination until after the second deal.
    state.trump = {
      type: 'seventh-card',
      suit: null, // Will be set after second deal
      isRevealed: false,
      seventhCard: null, // Will be set after second deal
      revealedBy: null,
      mustPlayTrump: false,
    };

    broadcasts.push({
      event: 'TRUMP_SELECTED',
      payload: { type: 'seventh-card' },
      // Don't reveal the suit to others yet
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
      mustPlayTrump: false,
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

    // If seventh-card trump mode, now determine the actual trump from the 7th card
    if (state.trump.type === 'seventh-card') {
      const declarer = state.players.find((p) => p.isDeclarer)!;
      const result = selectSeventhCardTrump(declarer.hand);
      state.trump.suit = result.suit;
      state.trump.seventhCard = result.seventhCard;

      // Tell the declarer the actual trump (private info)
      broadcasts.push({
        event: 'TRUMP_HIDDEN',
        payload: { suit: result.suit, seventhCard: result.seventhCard },
        targetPlayerIds: [declarer.id],
      });
    }

    // Send updated hands
    for (const player of state.players) {
      broadcasts.push({
        event: 'SECOND_DEAL_COMPLETED',
        payload: { hand: player.hand },
        targetPlayerIds: [player.id],
      });
    }

    // Check for marriage with normal suit trump (already revealed)
    // For seventh-card trump, marriage will be checked on reveal
    // For joker, marriage is disabled
    if (state.trump.type === 'suit' && state.trump.suit) {
      for (const player of state.players) {
        const marriageSuit = detectMarriage(player.hand, state.trump.suit);
        if (marriageSuit) {
          const declarer = state.players.find((p) => p.isDeclarer)!;
          // Only the first player found with marriage counts (typically the holder)
          // Marriage on the bidding team lowers effective bid; on defending team raises it
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
            payload: { playerId: player.id, suit: marriageSuit, effectiveBid },
          });
          break; // Only one marriage can be declared
        }
      }
    }

    // Proceed to double phase
    state.phase = GAME_PHASES.DOUBLE_PHASE;

    // Double phase: opponents of declarer can call double first
    const declarer = state.players.find((p) => p.isDeclarer)!;

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

    // After a declaration, the other side gets a chance to respond
    // Reset pass tracking for the response round
    state._doublePasses = [];

    if (level === 'fullset') {
      // Full set is the end of the chain — proceed to playing
      return this.startPlaying(state, broadcasts);
    }

    // Move to next player who can respond
    const nextSeat = level === 'double'
      ? this.getNextTeammateSeat(state, declarer.seat) // Re-double: declarer's team responds
      : this.getNextOpponentSeat(state, declarer.seat); // Full set: opponents respond

    state.currentTurn = nextSeat;

    return { newState: state, broadcasts };
  }

  private handlePassDouble(
    state: TwentyNineState,
    playerId: string,
    broadcasts: Broadcast[]
  ): ActionResult<TwentyNineState> {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) {
      return { newState: state, broadcasts, errors: [{ code: 'PLAYER_NOT_FOUND', message: 'Player not found' }] };
    }

    // Track passes
    if (!state._doublePasses) state._doublePasses = [];
    state._doublePasses.push(playerId);

    broadcasts.push({
      event: 'DOUBLE_PASSED',
      payload: { playerId },
    });

    const declarer = state.players.find((p) => p.isDeclarer)!;
    const declarerTeam = declarer.team;
    const callerTeam = player.team;

    // Determine who can respond next based on current double level
    if (state.double.level === 'normal') {
      // Opponents are deciding whether to double
      // Find the other opponent who hasn't passed yet
      const otherOpponent = state.players.find(
        (p) => p.team !== declarerTeam && p.id !== playerId && !state._doublePasses!.includes(p.id)
      );
      if (otherOpponent) {
        state.currentTurn = otherOpponent.seat;
        return { newState: state, broadcasts };
      }
      // Both opponents passed — proceed to playing (no double)
      return this.startPlaying(state, broadcasts);
    } else if (state.double.level === 'double') {
      // Declarer's team is deciding whether to re-double
      const otherTeammate = state.players.find(
        (p) => p.team === declarerTeam && p.id !== playerId && !state._doublePasses!.includes(p.id)
      );
      if (otherTeammate) {
        state.currentTurn = otherTeammate.seat;
        return { newState: state, broadcasts };
      }
      // Both teammates passed — proceed to playing (doubled)
      return this.startPlaying(state, broadcasts);
    } else if (state.double.level === 'redouble') {
      // Opponents are deciding whether to full-set
      const otherOpponent = state.players.find(
        (p) => p.team !== declarerTeam && p.id !== playerId && !state._doublePasses!.includes(p.id)
      );
      if (otherOpponent) {
        state.currentTurn = otherOpponent.seat;
        return { newState: state, broadcasts };
      }
      // Both opponents passed — proceed to playing (re-doubled)
      return this.startPlaying(state, broadcasts);
    }

    // Fallback: proceed to playing
    return this.startPlaying(state, broadcasts);
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
    const mustPlayTrump = state.trump.mustPlayTrump && state.trump.revealedBy === playerId;

    // Validate play (follow suit + revealer's one-turn trump obligation)
    if (!isValidPlay(player.hand, card, state.leadSuit, state.trump.suit, mustPlayTrump)) {
      const hasLeadSuit = player.hand.some((c) => c.suit === state.leadSuit);
      const hasTrump = state.trump.suit
        ? player.hand.some((c) => c.suit === state.trump.suit)
        : false;
      const message = hasLeadSuit
        ? 'You must follow the led suit'
        : (mustPlayTrump && hasTrump)
        ? 'You revealed trump — must play a trump card this turn'
        : 'Invalid play';
      return {
        newState: state,
        broadcasts,
        errors: [{ code: 'MUST_FOLLOW_SUIT', message }],
      };
    }

    // Play the card
    player.hand.splice(cardIndex, 1);
    state.currentTrick.plays.push({ playerId, card, cardIndex });

    // Clear mustPlayTrump after revealer plays their turn
    if (mustPlayTrump && state.trump.mustPlayTrump) {
      state.trump.mustPlayTrump = false;
    }

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
      state.trump.suit,
      state.trump.isRevealed
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

    // Validation already ensures: correct phase, player's turn, no led-suit cards
    state.trump.isRevealed = true;
    state.trump.revealedBy = playerId;
    state.trump.mustPlayTrump = true;

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

    // Calculate team points from all tricks
    const teams = new Map<string, 0 | 1>();
    for (const player of state.players) {
      teams.set(player.id, player.team);
    }

    const completedTricks = state.completedTricks.filter((t) => t.winnerId !== null) as { plays: { playerId: string; card: { suit: string; rank: string } }[]; winnerId: string }[];
    const teamPoints = calculateTeamPoints(completedTricks, teams);

    // Calculate tricks won per team for bonus calculation
    const tricksWonPerTeam = calculateTricksWonPerTeam(
      completedTricks as { winnerId: string }[],
      teams
    );

    // Determine effective bid
    const declarer = state.players.find((p) => p.isDeclarer)!;
    const effectiveBid = state.marriage?.effectiveBid ?? state.bidding.highestBid!;

    // Check if declarer succeeded
    const bidSuccess = didDeclarerSucceed(teamPoints[declarer.team], effectiveBid);

    // Calculate base match points
    const matchPointsResult = calculateMatchPoints(
      declarer.team,
      bidSuccess,
      state.double.multiplier
    );

    // Calculate bonus points (all tricks, zero tricks)
    const bonusPoints = calculateBonusPoints(tricksWonPerTeam, declarer.team);

    // Update score with set completion check
    state.score = updateScore(
      state.score,
      teamPoints,
      matchPointsResult,
      bonusPoints,
      bidSuccess,
      state.settings.setThreshold
    );

    broadcasts.push({
      event: 'SCORE_UPDATED',
      payload: {
        team0Points: teamPoints[0],
        team1Points: teamPoints[1],
        team0MatchPoints: state.score.matchPoints[0],
        team1MatchPoints: state.score.matchPoints[1],
        team0Sets: state.score.sets[0],
        team1Sets: state.score.sets[1],
        bidResult: bidSuccess ? 'success' : 'fail',
        declarerTeam: declarer.team,
        bonusPoints,
        effectiveBid,
      },
    });

    // Check if match is complete (a team has won enough sets)
    if (
      state.score.sets[0] >= state.settings.matchLength ||
      state.score.sets[1] >= state.settings.matchLength
    ) {
      state.phase = GAME_PHASES.MATCH_COMPLETE;
      const winner = state.score.sets[0] >= state.settings.matchLength ? 0 : 1;
      broadcasts.push({
        event: 'MATCH_FINISHED',
        payload: { winner, reason: `Team ${winner + 1} won ${state.settings.matchLength} sets` },
      });
    } else {
      // Stay in SCORING phase - next hand will be started by START_NEXT_HAND action
      state.phase = GAME_PHASES.SCORING;
    }

    return { newState: state, broadcasts };
  }

  private handleStartNextHand(
    state: TwentyNineState,
    broadcasts: Broadcast[]
  ): ActionResult<TwentyNineState> {
    this.prepareNextHand(state, broadcasts);
    return { newState: state, broadcasts };
  }

  /**
   * Prepare state for the next hand:
   * - Rotate dealer to next player (counter-clockwise)
   * - Reset bidding, trump, double, tricks, marriage
   * - Deal new hands
   * - Start bidding from dealer's next player
   */
  private prepareNextHand(
    state: TwentyNineState,
    broadcasts: Broadcast[]
  ): void {
    // Rotate dealer to next player (counter-clockwise)
    state.dealerSeat = (state.dealerSeat + 1) % 4;

    // Update dealer flags
    for (const p of state.players) {
      p.isDealer = p.seat === state.dealerSeat;
      p.isDeclarer = false;
    }

    // Reset bidding
    state.bidding = {
      currentBid: null,
      currentBidder: null,
      highestBid: null,
      highestBidder: null,
      bids: [],
      passCount: 0,
    };

    // Reset trump
    state.trump = {
      type: null,
      suit: null,
      isRevealed: false,
      seventhCard: null,
      revealedBy: null,
      mustPlayTrump: false,
    };

    // Reset double
    state.double = {
      level: 'normal',
      calledBy: null,
      multiplier: 1,
    };

    // Reset tricks
    state.completedTricks = [];
    state.currentTrick = {
      plays: [],
      leadSuit: null,
      winnerId: null,
      trickNumber: 0,
    };
    state.leadSuit = null;

    // Reset marriage
    state.marriage = null;

    // Reset weak hand
    state.weakHandPlayer = null;
    state.weakHandRequested = false;

    // Reset internal tracking
    state._doublePasses = [];

    // Build and shuffle new deck
    state.deck = shuffleDeck(buildDeck());

    // Deal first 4 cards
    const { hands, remaining } = firstDeal(state.deck, 4);
    state.deck = remaining;
    state.dealCount = 4;

    for (let i = 0; i < 4; i++) {
      state.players[i].hand = hands[i];
    }

    state.phase = GAME_PHASES.FIRST_DEAL;

    // Broadcast new hands
    for (const player of state.players) {
      broadcasts.push({
        event: 'FIRST_DEAL_COMPLETED',
        payload: { hand: player.hand },
        targetPlayerIds: [player.id],
      });
    }

    broadcasts.push({
      event: 'NEXT_HAND_STARTED',
      payload: {
        dealerId: state.players[state.dealerSeat].id,
        dealerSeat: state.dealerSeat,
      },
    });

    // Check for weak hands
    for (const player of state.players) {
      if (canCancelWeakHand(player.hand)) {
        state.weakHandPlayer = player.id;
        broadcasts.push({
          event: 'WEAK_HAND_DETECTED',
          payload: { playerId: player.id },
          targetPlayerIds: [player.id],
        });
        return;
      }
    }

    // No weak hand — proceed to bidding
    this.startBidding(state, broadcasts);
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

  private validatePassDouble(state: TwentyNineState, playerId: string): { valid: boolean; error?: string } {
    if (state.phase !== GAME_PHASES.DOUBLE_PHASE) return { valid: false, error: 'Not in double phase' };
    const player = state.players.find((p) => p.id === playerId);
    if (!player) return { valid: false, error: 'Player not found' };
    if (player.seat !== state.currentTurn) return { valid: false, error: 'Not your turn' };
    return { valid: true };
  }

  private validatePlayCard(state: TwentyNineState, playerId: string, cardIndex: number): { valid: boolean; error?: string } {
    if (state.phase !== GAME_PHASES.PLAYING) return { valid: false, error: 'Not in playing phase' };
    const player = state.players.find((p) => p.id === playerId);
    if (!player || player.seat !== state.currentTurn) return { valid: false, error: 'Not your turn' };
    if (cardIndex < 0 || cardIndex >= player.hand.length) return { valid: false, error: 'Invalid card index' };

    const card = player.hand[cardIndex];
    const mustPlayTrump = state.trump.mustPlayTrump && state.trump.revealedBy === playerId;
    if (!isValidPlay(player.hand, card, state.leadSuit, state.trump.suit, mustPlayTrump)) {
      const hasLeadSuit = player.hand.some((c) => c.suit === state.leadSuit);
      if (hasLeadSuit) return { valid: false, error: 'Must follow the led suit' };
      if (mustPlayTrump && state.trump.suit && player.hand.some((c) => c.suit === state.trump.suit)) {
        return { valid: false, error: 'You revealed trump — must play a trump card this turn' };
      }
      return { valid: false, error: 'Invalid play' };
    }
    return { valid: true };
  }

  private validateTrumpReveal(state: TwentyNineState, playerId: string): { valid: boolean; error?: string } {
    // Allow reveal for any hidden trump (suit or seventh-card), but not joker
    if (!state.trump.type || state.trump.type === 'joker') return { valid: false, error: 'No trump to reveal' };
    if (state.trump.isRevealed) return { valid: false, error: 'Trump already revealed' };
    const player = state.players.find((p) => p.id === playerId);
    if (!player) return { valid: false, error: 'Player not found' };
    // Must be the player's turn
    if (player.seat !== state.currentTurn) return { valid: false, error: 'Not your turn' };
    // Must be in playing phase
    if (state.phase !== GAME_PHASES.PLAYING) return { valid: false, error: 'Not in playing phase' };
    // There must be a led suit (not the first card of the trick - leader can't reveal)
    if (!state.leadSuit) return { valid: false, error: 'Cannot reveal when leading the trick' };
    // Player must NOT have any cards of the led suit
    const hasLedSuit = player.hand.some((c) => c.suit === state.leadSuit);
    if (hasLedSuit) return { valid: false, error: 'Must follow suit - cannot reveal' };
    // Player must have at least one trump card to make reveal meaningful (optional but logical)
    if (!state.trump.suit) return { valid: false, error: 'No trump suit set' };
    return { valid: true };
  }

  private validateStartNextHand(state: TwentyNineState): { valid: boolean; error?: string } {
    if (state.phase !== GAME_PHASES.SCORING) return { valid: false, error: 'Can only start next hand after scoring' };
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

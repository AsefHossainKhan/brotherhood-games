# 29 Card Game — E2E Test Scenarios

Comprehensive list of every scenario to cover via Playwright E2E tests.
Each scenario is tagged with priority (P0 = must-have, P1 = important, P2 = nice-to-have).

---

## 1. Lobby & Room Management

| # | Scenario | Priority |
|---|----------|----------|
| 1.1 | Host creates a room, sees 4-char code | P0 |
| 1.2 | Player joins by code, appears in lobby | P0 |
| 1.3 | 4 players join, start button enables | P0 |
| 1.4 | Host starts game → all 4 see game board | P0 |
| 1.5 | Player switches teams (A↔B) | P1 |
| 1.6 | Player leaves room, lobby updates | P1 |
| 1.7 | Non-host cannot start game | P2 |
| 1.8 | 5th player cannot join (room full) | P2 |
| 1.9 | Spectator joins and sees game but no hand | P2 |

---

## 2. First Deal & Weak Hand

| # | Scenario | Priority |
|---|----------|----------|
| 2.1 | After start, each player sees 4 cards in hand | P0 |
| 2.2 | Phase transitions: FIRST_DEAL → BIDDING | P0 |
| 2.3 | Weak hand detected → player sees cancel option | P1 |
| 2.4 | Weak hand: player declines → proceeds to bidding | P1 |
| 2.5 | Weak hand: player confirms → redeal occurs | P1 |
| 2.6 | Weak hand: new deal also weak → can cancel again | P2 |

---

## 3. Bidding

| # | Scenario | Priority |
|---|----------|----------|
| 3.1 | First bidder (dealer's right) sees bid panel | P0 |
| 3.2 | Player places bid 16 → bid is reflected to all | P0 |
| 3.3 | Player passes → turn moves to next player | P0 |
| 3.4 | 3 pass + 1 bid → bidding ends, trump selection starts | P0 |
| 3.5 | All 4 pass → redeal occurs, bidding restarts | P0 |
| 3.6 | Bid must be ≥ current highest + 1 | P1 |
| 3.7 | Bid must be ≤ 28 | P1 |
| 3.8 | Out-of-turn bid is rejected | P1 |
| 3.9 | Competitive bidding: player bids 16, next bids 18 | P1 |
| 3.10 | Bid slider reflects min/max correctly | P1 |
| 3.11 | Bid panel only shows on current bidder's screen | P0 |
| 3.12 | After bidding ends, declarer is marked | P0 |

---

## 4. Trump Selection

| # | Scenario | Priority |
|---|----------|----------|
| 4.1 | Declarer sees trump selector (4 suits + 7th card + joker) | P0 |
| 4.2 | Non-declarer does NOT see trump selector | P0 |
| 4.3 | Select suit trump → trump shown to all in scoreboard | P0 |
| 4.4 | Select suit trump → phase moves to DOUBLE_PHASE | P0 |
| 4.5 | Select 7th card → trump hidden from non-declarers | P0 |
| 4.6 | Select 7th card → declarer sees the actual trump suit | P0 |
| 4.7 | Select joker → no trump suit displayed | P1 |
| 4.8 | Each player receives 4 more cards (total 8) after trump | P0 |

---

## 5. Double Phase

| # | Scenario | Priority |
|---|----------|----------|
| 5.1 | Opponent sees Double button when it's their turn | P0 |
| 5.2 | Declarer's team does NOT see Double button | P0 |
| 5.3 | Opponent doubles → multiplier becomes ×2 | P0 |
| 5.4 | After double, declarer's teammate sees Re-Double | P0 |
| 5.5 | Re-double → multiplier becomes ×4 | P1 |
| 5.6 | After re-double, opponent sees Full Set | P1 |
| 5.7 | Full set → multiplier becomes ×6 | P1 |
| 5.8 | All opponents pass → skip to playing (×1) | P0 |
| 5.9 | Double then pass → skip to playing (×2) | P0 |
| 5.10 | Double panel shows waiting state for non-current players | P0 |

---

## 6. Playing Phase (Tricks)

| # | Scenario | Priority |
|---|----------|----------|
| 6.1 | Declarer leads the first trick | P0 |
| 6.2 | Current player sees cards as clickable | P0 |
| 6.3 | Non-current player cannot play cards | P0 |
| 6.4 | Click card once = select (highlights), click again = play | P0 |
| 6.5 | Follow suit enforced: must play led suit if held | P0 |
| 6.6 | Void in led suit: can play any card | P0 |
| 6.7 | After 4 cards, trick resolves → winner shown | P0 |
| 6.8 | Trick winner leads next trick | P0 |
| 6.9 | Played cards appear in table area | P0 |
| 6.10 | Trick counter increments (1/8, 2/8, ...) | P0 |
| 6.11 | All 8 tricks played → game ends | P0 |

---

## 7. Trump Reveal (7th Card Mode)

| # | Scenario | Priority |
|---|----------|----------|
| 7.1 | Reveal button appears for any player with trump-suit card | P0 |
| 7.2 | Player without trump-suit card cannot reveal | P0 |
| 7.3 | After reveal, trump suit becomes public in scoreboard | P0 |
| 7.4 | After reveal, marriage is checked and declared | P0 |
| 7.5 | Multiple players can potentially reveal (any player with trump card) | P1 |
| 7.6 | Revealer must play trump suit if they hold it (on their next turn) | P1 |
| 7.7 | Trump reveal during trick play (mid-game reveal) | P1 |

---

## 8. Marriage

| # | Scenario | Priority |
|---|----------|----------|
| 8.1 | Marriage declared when K+Q of trump found in hand | P0 |
| 8.2 | Marriage on bidding team → effectiveBid = max(16, bid-4) | P0 |
| 8.3 | Marriage on defending team → effectiveBid = min(28, bid+4) | P0 |
| 8.4 | Marriage info shown in scoreboard | P0 |
| 8.5 | No marriage in joker mode | P1 |
| 8.6 | No marriage before trump reveal (7th card mode) | P1 |

---

## 9. Scoring & Game End

| # | Scenario | Priority |
|---|----------|----------|
| 9.1 | Team points calculated from won tricks | P0 |
| 9.2 | Declarer succeeds: points ≥ effectiveBid → +matchPoints | P0 |
| 9.3 | Declarer fails: points < effectiveBid → -matchPoints | P0 |
| 9.4 | Match points: normal = ±1 | P0 |
| 9.5 | Match points: double = ±2 | P1 |
| 9.6 | Match points: redouble = ±4 | P1 |
| 9.7 | Match points: fullset = ±6 | P1 |
| 9.8 | Set completion: cumulative ±6 threshold | P1 |
| 9.9 | Match completion: first to N sets wins | P1 |
| 9.10 | Dealer rotates after each game | P1 |
| 9.11 | Scoreboard updates after each game | P0 |

---

## 10. Hidden Trump Never Revealed

| # | Scenario | Priority |
|---|----------|----------|
| 10.1 | 7th card mode, all 8 tricks played, nobody reveals → game cancelled | P0 |
| 10.2 | Cancelled game: no points awarded | P0 |
| 10.3 | Scoreboard shows cancellation message | P1 |

---

## 11. Visibility & Information Hiding

| # | Scenario | Priority |
|---|----------|----------|
| 11.1 | Player sees own hand (8 cards) | P0 |
| 11.2 | Player does NOT see opponent hands | P0 |
| 11.3 | Player sees opponent card count | P0 |
| 11.4 | 7th card trump: non-declarer sees "hidden" in scoreboard | P0 |
| 11.5 | 7th card trump: declarer sees actual trump in scoreboard | P0 |
| 11.6 | Normal trump: all players see trump suit | P0 |
| 11.7 | Joker mode: all players see "None" for trump | P1 |

---

## 12. Edge Cases & Error Handling

| # | Scenario | Priority |
|---|----------|----------|
| 12.1 | Player cannot act when it's not their turn | P0 |
| 12.2 | Invalid card index rejected | P1 |
| 12.3 | Bid below minimum rejected | P1 |
| 12.4 | Bid above 28 rejected | P1 |
| 12.5 | Double from wrong team rejected | P1 |
| 12.6 | Game error shows toast on frontend | P1 |
| 12.7 | Socket disconnect → PLAYER_DISCONNECTED event | P2 |
| 12.8 | Socket reconnect → state resynchronized | P2 |

---

## Test Implementation Plan

### Phase 1: Core Flow (P0) — Must pass consistently
- 1.1-1.4, 2.1-2.2, 3.1-3.5, 3.11-3.12, 4.1-4.4, 4.7-4.8
- 5.1-5.2, 5.8-5.10, 6.1-6.11, 9.1-9.4, 9.11, 11.1-11.6

### Phase 2: Important Scenarios (P1)
- 2.3-2.5, 3.6-3.10, 4.5-4.6, 5.3-5.7, 7.1-7.4, 8.1-8.4
- 9.5-9.10, 10.1-10.2, 11.7, 12.1-12.6

### Phase 3: Nice-to-have (P2)
- 1.7-1.9, 2.6, 7.5-7.7, 8.5-8.6, 10.3, 12.7-12.8

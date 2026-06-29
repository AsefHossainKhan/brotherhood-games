# Bangladeshi 29 Rules Specification

## Players
- 4 players
- 2 teams
- Opposite players are partners
- Counter-clockwise play

## Deck

32 cards:
J, 9, A, 10, K, Q, 8, 7

Ranking:
J > 9 > A > 10 > K > Q > 8 > 7

Points:
J = 3
9 = 2
A = 1
10 = 1

Total deck points = 28

## Dealer
Dealer rotates counter-clockwise after every game.

## First Deal
Each player receives 4 cards.

## Weak Hand Cancellation
If a player receives 4 cards containing zero points:
- No J
- No 9
- No A
- No 10

They may optionally request cancellation.

## Bidding

- Starts at dealer's right
- Counter-clockwise
- Single bidding round
- Min bid = 16
- Max bid = 28
- Pass allowed

Highest bidder becomes declarer.

## Trump Selection

Declarer chooses:

1. Normal suit trump
2. Seventh-card trump
3. Joker (No Trump)

## Standard Trump
Trump suit immediately known.

## Seventh Card Trump

- Declarer selects seventh-card mode
- Trump suit determined by actual seventh card
- Only declarer sees it
- Hidden until reveal
- Partner does not see it
- Spectators do not see it

## Joker

- No trump exists
- No reveal later
- Marriage disabled
- Double/Re-Double still allowed

## Second Deal

Each player receives 4 more cards.
Total cards per player = 8

## Double Phase

Occurs after second deal.

Allowed sequence:

Double
-> Re-Double
-> Full Set

Rules:

- Opponent may call Double
- Declarer team may call Re-Double
- Opponent may call Full Set

## Following Suit

Players must follow suit whenever possible.

## Trump Reveal

Only for seventh-card trump.

A player may choose to reveal.

After reveal:
- Hidden card becomes public
- Trump suit becomes active

If player has revealed suit:
- Must play it

Otherwise:
- May play any card

## Marriage

Marriage:
King + Queen of trump suit

Only valid after trump reveal.

Automatically checked and declared after reveal.

### Marriage Adjustment

If marriage belongs to bidding team:

effectiveBid = max(16, bid - 4)

If marriage belongs to defending team:

effectiveBid = min(28, bid + 4)

Examples:
18 -> 16
17 -> 16
25 -> 28
27 -> 28

## Trick Resolution

- Highest card of led suit wins
- Trump beats non-trump
- Highest trump wins
- Winner leads next trick

Total tricks = 8

## Hidden Trump Never Revealed

If game ends without revealing hidden trump:
- Game cancelled
- No points awarded

## Scoring

Declarer succeeds if:

teamPoints >= effectiveBid

Otherwise declarer fails.

## Match Points

Normal = ±1

Double = ±2

Re-Double = ±4

Full Set = ±6

## Set Tracking

When cumulative score reaches:

+6 or -6

Award a set.

Traditional marker:
- Red 2 = positive set
- Black 2 = negative set

## Single

Special declaration.

Rules:

- Declarer plays alone
- Partner folds all cards face down
- No trump
- No bidding target
- No marriage
- No double/re-double/full-set

Objective:

Win all 8 tricks.

Success:
+3 match points

Failure:
-3 match points

Play starts from Single caller.

## Disconnects

Reconnect window:
5 minutes

Failure to reconnect:
Forfeit.

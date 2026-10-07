# WebSocket Protocol

## Connection Handshake

Every socket connects with handshake auth:
- guestToken: the guest's secret, a random UUID the client keeps in local storage
- username

The guestToken is the only proof of identity. It travels in the handshake and
nowhere else: no event carries it, and the server never sends it to any client.

The server derives the guest's public player id from the guestToken by a
one-way hash. Every event a socket sends is attributed to that player id.
Other clients only ever see the public player id (in playerId, userId and
hostId fields), and knowing it gives no control over that player.

On connect the server sends the socket its own id in SESSION_READY, so the
client can recognise itself in room and game state.

## Client Events

CREATE_ROOM
JOIN_ROOM
LEAVE_ROOM

BECOME_SPECTATOR

START_GAME

PLACE_BID
PASS_BID

SELECT_TRUMP
SELECT_SEVENTH_CARD_TRUMP
SELECT_JOKER

DECLARE_DOUBLE
DECLARE_REDOUBLE
DECLARE_FULLSET

DECLARE_SINGLE

PLAY_CARD

REQUEST_TRUMP_REVEAL

RECONNECT_ROOM

PING

## Server Events

SESSION_READY

ROOM_CREATED
ROOM_UPDATED

PLAYER_JOINED
PLAYER_LEFT

SPECTATOR_JOINED
SPECTATOR_LEFT

GAME_STARTED

FIRST_DEAL_COMPLETED
SECOND_DEAL_COMPLETED

BID_UPDATED
BIDDING_FINISHED

TRUMP_SELECTED
TRUMP_REVEALED

MARRIAGE_DECLARED

CARD_PLAYED

TRICK_COMPLETED

SCORE_UPDATED

GAME_FINISHED

PLAYER_DISCONNECTED
PLAYER_RECONNECTED

RECONNECT_FAILED

ERROR

## Reconnection Flow

The client opens a socket with its guestToken in the handshake, then sends
RECONNECT_ROOM { roomCode }.

Server:
- derives the player id from the handshake guestToken (never from the event)
- validates the reservation for that player id in that room
- restores seat
- restores hand
- sends current state

If there is no such room, or no reservation for that player id in it, the
server sends RECONNECT_FAILED { roomCode, reason } with reason ROOM_NOT_FOUND
or NO_RESERVATION, and restores nothing.

A client that knows another player's public id cannot reconnect as them: the
reservation is found by the id derived from the caller's own guestToken.

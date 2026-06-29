# Multiplayer Card Game Hub - Architecture

## Overview

A web-based multiplayer card game platform initially launching with Bangladeshi 29 and designed to support additional games such as Poker in the future.

## Technology Stack

### Backend
- Node.js
- TypeScript
- Express
- Socket.IO
- Prisma ORM
- MySQL

### Frontend
- Next.js
- TypeScript
- Tailwind CSS
- Zustand
- TanStack Query
- Socket.IO Client

### Infrastructure
- OCI Free Tier VM
- Nginx Reverse Proxy
- TLS/SSL
- PM2 or Docker Compose

## Core Principles

### Server Authoritative
Server is responsible for:
- Shuffling
- Dealing
- Validation
- Scoring
- Rule enforcement
- Match progression

### Room Based System
- Room code join
- No login required for MVP
- Authentication can be added later

### Identity Model
Guest and registered users should share a common abstraction.

## Spectators

Room
- Players (max 4)
- Spectators (unlimited)

Rules:
- Spectators may join anytime
- Spectators may leave anytime
- Spectators cannot perform actions
- Spectators cannot see hands
- Spectators cannot see hidden trump
- Spectators cannot see hidden seventh-card trump

## Reconnection

- Guest identity stored locally
- Seat reserved for 5 minutes
- Hand restored on reconnect
- State resynchronized on reconnect

Failure to reconnect within 5 minutes:
- Team forfeits
- Match ends
- Room cleaned up

## Game Engine Architecture

Socket Layer
    -> Game Runtime
        -> TwentyNineEngine
        -> PokerEngine

## Event Sourcing

Store events:

- ROOM_CREATED
- PLAYER_JOINED
- BID_PLACED
- TRUMP_SELECTED
- CARD_PLAYED
- TRICK_WON
- GAME_FINISHED

Game state should be reconstructed from events.

## State Machine

WAITING_FOR_PLAYERS
-> FIRST_DEAL
-> BIDDING
-> TRUMP_SELECTION
-> SECOND_DEAL
-> DOUBLE_PHASE
-> PLAYING
-> TRUMP_REVEAL
-> MARRIAGE_RESOLUTION
-> SCORING
-> MATCH_COMPLETE

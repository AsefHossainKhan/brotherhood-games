# Brotherhood Games

A modular multiplayer card game hub built for Discord communities. Starting with Bangladeshi 29, designed to support additional games like Poker in the future.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, TypeScript, Express, Socket.IO, Prisma, MySQL |
| Frontend | Next.js, TypeScript, Tailwind CSS, Zustand, Socket.IO Client |
| Shared | TypeScript types, constants, SVG card components |
| Infrastructure | Docker Compose, Nginx, OCI Free Tier |

## Project Structure

```
brotherhood-games/
├── .env                          # Single source of truth for all env vars
├── package.json                  # Root workspace config + DB scripts
├── turbo.json                    # Turborepo pipeline config
├── docker-compose.yml            # Production service orchestration
│
├── packages/
│   ├── shared/                   # @brotherhood/shared
│   │   ├── src/types/            # Card, Room, Event type definitions
│   │   ├── src/constants/        # Game constants, phases, defaults
│   │   └── src/cards/            # SVG card components + pure utilities
│   │
│   ├── game-engine/              # @brotherhood/game-engine
│   │   └── src/                  # GameEngine interface, GameRegistry, GameRuntime, Room
│   │
│   └── games/
│       └── twenty-nine/          # @brotherhood/twenty-nine
│           └── src/              # 29 engine, logic (deck, tricks, scoring, marriage, trump)
│
├── backend/                      # @brotherhood/backend
│   ├── src/                      # Express server, Socket.IO handlers, services
│   ├── prisma/schema.prisma      # Database schema (User, Room, Match)
│   └── Dockerfile
│
├── frontend/                     # @brotherhood/frontend
│   ├── src/app/                  # Next.js app (home, room pages)
│   ├── src/components/           # UI components (lobby, game board, 29-specific)
│   ├── src/stores/               # Zustand stores (socket, room, game, settings)
│   ├── src/hooks/                # React hooks (useSocket, useRoom, useGame)
│   └── Dockerfile
│
└── nginx/
    ├── nginx.conf                # Reverse proxy config
    └── certs/                    # SSL certificates (for production)
```

## Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- MySQL 8.0+ (local or remote)

## Quick Start

### 1. Clone and install

```bash
git clone <repo-url> brotherhood-games
cd brotherhood-games
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your MySQL credentials
```

The `.env` file at the project root is the **single source of truth** for all environment variables. Both backend and frontend load from it via `dotenv-cli`. You never need a `.env` inside `backend/` or `frontend/`.

### 3. Set up database

```bash
# Create the database and apply migrations
npm run db:migrate

# Generate Prisma Client
npm run db:generate
```

### 4. Start development

```bash
# Start all services (backend + frontend) via Turborepo
npm run dev
```

This starts:
- **Backend** at `http://localhost:3001` (Express + Socket.IO)
- **Frontend** at `http://localhost:3000` (Next.js)

## All Commands

### Root (run from project root)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start backend + frontend in development mode |
| `npm run build` | Build all packages for production |
| `npm run lint` | Lint all packages |
| `npm run test` | Run all tests |
| `npm run clean` | Clean all build outputs |
| `npm run db:migrate` | Create/apply database migrations |
| `npm run db:push` | Push schema changes without migration |
| `npm run db:studio` | Open Prisma Studio (visual DB browser) |
| `npm run db:generate` | Regenerate Prisma Client |

### Backend (run from `backend/`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start backend with hot-reload (tsx watch) |
| `npm run build` | Compile TypeScript |
| `npm run start` | Run compiled production build |
| `npm run lint` | Type-check without emitting |
| `npm run db:migrate` | Create/apply migrations |
| `npm run db:push` | Push schema changes |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:generate` | Regenerate Prisma Client |

### Frontend (run from `frontend/`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Build for production |
| `npm run start` | Run production build |
| `npm run lint` | Run Next.js lint |

### Testing

Unit tests use [Vitest](https://vitest.dev/) across all packages.

```bash
# Run all tests via Turborepo
npm run test

# Run tests for a specific package
cd packages/games/twenty-nine && npm test
cd packages/shared && npm test

# Watch mode (from any package directory)
npx vitest

# Run with coverage
npx vitest run --coverage
```

| Package | Test files | Coverage |
|---------|-----------|----------|
| `@brotherhood/shared` | `src/cards/utils.test.ts` | Card utilities, deck builders, sorting |
| `@brotherhood/twenty-nine` | `src/logic/*.test.ts` | Deck, tricks, scoring, marriage, trump, dealing |
| `@brotherhood/backend` | _(coming soon)_ | — |
| `@brotherhood/frontend` | _(coming soon)_ | — |
| `@brotherhood/game-engine` | _(coming soon)_ | — |

### Individual Packages (run from `packages/`)

```bash
# Type-check a specific package
npx tsc --noEmit -p packages/shared/tsconfig.json
npx tsc --noEmit -p packages/game-engine/tsconfig.json
npx tsc --noEmit -p packages/games/twenty-nine/tsconfig.json
```

## Production Deployment

### Docker Compose (Recommended)

Docker Compose runs all services: backend, frontend, nginx (reverse proxy), and MySQL.

```bash
# 1. Ensure .env is configured with production values
cp .env.example .env
# Edit .env — set DATABASE_URL, MYSQL_ROOT_PASSWORD, etc.

# 2. Build and start all services
docker compose up --build -d

# 3. Run database migrations (first time only)
docker compose exec backend npx prisma migrate deploy

# 4. View logs
docker compose logs -f

# 5. Stop all services
docker compose down
```

Services after `docker compose up`:

| Service | URL | Description |
|---------|-----|-------------|
| Nginx | `http://localhost` | Reverse proxy (entry point) |
| Frontend | `http://localhost:3000` | Next.js app |
| Backend | `http://localhost:3001` | Express + Socket.IO API |
| MySQL | `localhost:3306` | Database |

Nginx routes:
- `/` → Frontend (Next.js)
- `/api/*` → Backend (Express)
- `/socket.io/*` → Backend (Socket.IO WebSocket)

### Environment Variables

All variables live in the root `.env` file:

| Variable | Used By | Description |
|----------|---------|-------------|
| `BACKEND_PORT` | Backend | Backend port (default: 3001) |
| `FRONTEND_PORT` | Frontend | Frontend dev server port (default: 3000) |
| `DATABASE_URL` | Backend, Prisma | MySQL connection string |
| `CORS_ORIGIN` | Backend | Allowed CORS origin |
| `NEXT_PUBLIC_API_URL` | Frontend | Backend API URL (embedded at build time) |
| `NEXT_PUBLIC_WS_URL` | Frontend | Socket.IO URL (embedded at build time) |
| `MYSQL_ROOT_PASSWORD` | Docker Compose | MySQL root password |
| `MYSQL_USER` | Docker Compose | MySQL user |
| `MYSQL_PASSWORD` | Docker Compose | MySQL password |

> **Note:** `NEXT_PUBLIC_*` variables are embedded into the frontend bundle at build time. They cannot be changed at runtime. For Docker, they are passed as build args in `docker-compose.yml`.

## Architecture

### Pluggable Game Engine

All games implement the `GameEngine` interface:

```typescript
interface GameEngine<TState> {
  gameType: string;
  createInitialState(playerIds, settings): TState;
  handleAction(state, action): { newState, broadcasts };
  validateAction(state, action): { valid, error? };
  getVisibleState(state, playerId, role): Partial<TState>;
  getPhase(state): string;
  isComplete(state): boolean;
}
```

- `GameRuntime` is game-agnostic — manages rooms, connections, reconnection
- `TwentyNineEngine` implements all 29-specific logic
- Adding a new game = new package under `packages/games/`, implement interface, register in `GameRegistry`

### State Machine (29)

```
WAITING_FOR_PLAYERS → FIRST_DEAL → BIDDING → TRUMP_SELECTION
→ SECOND_DEAL → DOUBLE_PHASE → PLAYING → SCORING → MATCH_COMPLETE
```

### Socket Events

Client → Server: `CREATE_ROOM`, `JOIN_ROOM`, `PLACE_BID`, `PLAY_CARD`, etc.
Server → Client: `ROOM_UPDATED`, `GAME_STATE_UPDATED`, `ERROR`, etc.

See `card-game-docs/websocket_protocol.md` for the full protocol.

## License

Private — Brotherhood Games Community

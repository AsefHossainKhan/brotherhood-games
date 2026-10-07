import { createHash } from 'crypto';

/**
 * Guest identity — SPEC: spec-b5759c.
 *
 * The guestToken is the guest's secret: it arrives in the handshake auth and
 * is never sent to any client. The public player id is a one-way hash of it,
 * so the id can be broadcast freely without letting anyone act as its owner.
 */

const MIN_TOKEN_LENGTH = 16;
const MAX_TOKEN_LENGTH = 128;

/** Whether a handshake value can serve as a guestToken. */
export function isValidGuestToken(token: unknown): token is string {
  return (
    typeof token === 'string' &&
    token.length >= MIN_TOKEN_LENGTH &&
    token.length <= MAX_TOKEN_LENGTH
  );
}

/** The public player id for a guestToken. */
export function derivePlayerId(guestToken: string): string {
  return createHash('sha256').update(guestToken).digest('hex').slice(0, 32);
}

/**
 * Modern ID generation utilities using nanoid
 * Replaces Math.random().toString(36) with secure, collision-resistant IDs
 */

import { customAlphabet } from 'nanoid';

// Default settings
const DEFAULT_SESSION_ID_LENGTH = 12;

// Custom alphabets for different use cases
const READABLE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'; // No ambiguous chars

// ID generators with custom alphabets
const generateReadableId = customAlphabet(READABLE_ALPHABET, DEFAULT_SESSION_ID_LENGTH);

/**
 * Generate a secure session ID
 * More secure and collision-resistant than Math.random().toString(36)
 */
export function generateSessionId(): string {
  return generateReadableId();
}

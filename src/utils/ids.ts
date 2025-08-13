/**
 * Modern ID generation utilities using nanoid
 * Replaces Math.random().toString(36) with secure, collision-resistant IDs
 */

import { customAlphabet, nanoid } from 'nanoid';

// Default settings
const DEFAULT_SESSION_ID_LENGTH = 12;
const DEFAULT_WORKFLOW_ID_LENGTH = 8;

// Custom alphabets for different use cases
const URL_SAFE_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const READABLE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'; // No ambiguous chars

// ID generators with custom alphabets
const generateReadableId = customAlphabet(READABLE_ALPHABET, DEFAULT_SESSION_ID_LENGTH);
const generateUrlSafeId = customAlphabet(URL_SAFE_ALPHABET, DEFAULT_WORKFLOW_ID_LENGTH);

/**
 * Generate a secure session ID
 * More secure and collision-resistant than Math.random().toString(36)
 */
export function generateSessionId(): string {
  return generateReadableId();
}

/**
 * Generate a workflow step ID
 */
export function generateWorkflowStepId(): string {
  return generateUrlSafeId();
}

/**
 * Generate a short unique ID for temporary use
 */
export function generateShortId(length = 6): string {
  return nanoid(length);
}

/**
 * Generate a UUID-like ID for compatibility
 */
export function generateUuidLikeId(): string {
  return nanoid(21); // Similar length to UUID without dashes
}

/**
 * Generate an ID with custom length and alphabet
 */
export function generateCustomId(length: number, alphabet?: string): string {
  if (alphabet) {
    const customGenerator = customAlphabet(alphabet, length);
    return customGenerator();
  }
  return nanoid(length);
}

/**
 * Validate if a string looks like a nanoid
 */
export function isValidNanoId(id: string, expectedLength?: number): boolean {
  if (typeof id !== 'string') return false;
  if (expectedLength && id.length !== expectedLength) return false;

  // Check if contains only URL-safe characters
  return /^[A-Za-z0-9_-]+$/.test(id);
}

/**
 * Generate a timestamp-prefixed ID for sortable IDs
 */
export function generateTimestampId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = nanoid(8);
  return `${timestamp}-${randomPart}`;
}

/**
 * Extract timestamp from timestamp-prefixed ID
 */
export function extractTimestampFromId(id: string): number | null {
  const parts = id.split('-');
  if (parts.length !== 2 || !parts[0]) return null;

  try {
    return parseInt(parts[0], 36);
  } catch {
    return null;
  }
}

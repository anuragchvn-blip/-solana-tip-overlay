/**
 * Cryptographic utilities for signature verification
 */

import nacl from 'tweetnacl';
import bs58 from 'bs58';

/**
 * Verify an ed25519 signature
 * @param {string} message - Original message that was signed
 * @param {string} signatureBase58 - Signature in base58 format
 * @param {string} pubkeyBase58 - Public key in base58 format
 * @returns {boolean} True if signature is valid
 */
export function verifySignature(message, signatureBase58, pubkeyBase58) {
  try {
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signatureBase58);
    const pubkeyBytes = bs58.decode(pubkeyBase58);

    return nacl.sign.detached.verify(messageBytes, signatureBytes, pubkeyBytes);
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Create a challenge message for streamer linking
 * @param {string} streamerId - Streamer identifier
 * @returns {string} Challenge message to be signed
 */
export function createChallengeMessage(streamerId) {
  const timestamp = new Date().toISOString();
  return `Link streamer ${streamerId} at ${timestamp}`;
}

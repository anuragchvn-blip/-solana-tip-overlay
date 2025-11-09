/**
 * Transaction parser for detecting tips
 */

import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';

/**
 * Parse a transaction to detect tips to a specific address
 * @param {object} transaction - Solana transaction object from getTransaction()
 * @param {string} targetPubkey - Public key to check for incoming transfers
 * @returns {object|null} Tip info or null if no tip detected
 */
export function parseTipTransaction(transaction, targetPubkey) {
  if (!transaction || !transaction.meta) {
    return null;
  }

  const { meta, transaction: tx, slot, blockTime } = transaction;
  const accountKeys = tx.message.accountKeys.map(key => key.toString());
  
  // Find the index of our target address
  const targetIndex = accountKeys.indexOf(targetPubkey);
  if (targetIndex === -1) {
    return null;
  }

  // Calculate balance change
  const preBalance = meta.preBalances[targetIndex];
  const postBalance = meta.postBalances[targetIndex];
  const balanceChange = postBalance - preBalance;

  // Only process positive balance changes (incoming)
  if (balanceChange <= 0) {
    return null;
  }

  // Find the sender (first account that decreased balance)
  let fromAddress = 'unknown';
  for (let i = 0; i < accountKeys.length; i++) {
    if (meta.preBalances[i] > meta.postBalances[i] && i !== targetIndex) {
      fromAddress = accountKeys[i];
      break;
    }
  }

  return {
    from: fromAddress,
    amountLamports: balanceChange,
    amountSol: balanceChange / LAMPORTS_PER_SOL,
    slot,
    blockTime
  };
}

/**
 * Extract memo from transaction if present
 * @param {object} transaction - Solana transaction object
 * @returns {string|null} Memo text or null
 */
export function extractMemo(transaction) {
  if (!transaction || !transaction.transaction) {
    return null;
  }

  const MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
  const { instructions } = transaction.transaction.message;

  for (const ix of instructions) {
    const programId = transaction.transaction.message.accountKeys[ix.programIdIndex].toString();
    if (programId === MEMO_PROGRAM_ID && ix.data) {
      try {
        // Memo data is base58 encoded UTF-8 text
        return Buffer.from(bs58.decode(ix.data)).toString('utf-8');
      } catch (e) {
        console.error('Failed to decode memo:', e);
      }
    }
  }

  return null;
}

/**
 * TipSender - Client-side utility for sending tips
 * Use this in browser environments
 */

export class TipSender {
  constructor(apiBaseUrl) {
    this.apiBaseUrl = apiBaseUrl || '';
  }

  /**
   * Get streamer wallet info
   * @param {string} streamerId - Streamer identifier
   * @returns {Promise<object>} Streamer info with pubkey
   */
  async getStreamerWallet(streamerId) {
    const response = await fetch(`${this.apiBaseUrl}/api/streamer/${streamerId}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Streamer not found. They need to link their wallet first.');
      }
      throw new Error('Failed to fetch streamer info');
    }

    return await response.json();
  }

  /**
   * Build a tip transaction with optional memo
   * This returns a transaction object that needs to be signed and sent
   * @param {object} solanaWeb3 - @solana/web3.js module
   * @param {string} fromPubkey - Sender's public key
   * @param {string} toPubkey - Recipient's public key
   * @param {number} lamports - Amount in lamports
   * @param {string} memo - Optional memo message
   * @returns {Promise<Transaction>}
   */
  async buildTipTransaction(solanaWeb3, fromPubkey, toPubkey, lamports, memo = null) {
    const { Transaction, SystemProgram, PublicKey, TransactionInstruction } = solanaWeb3;
    
    const transaction = new Transaction();
    
    // Add transfer instruction
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(fromPubkey),
        toPubkey: new PublicKey(toPubkey),
        lamports
      })
    );

    // Add memo if provided
    if (memo && memo.trim()) {
      const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
      transaction.add(
        new TransactionInstruction({
          keys: [],
          programId: MEMO_PROGRAM_ID,
          data: Buffer.from(memo.trim(), 'utf-8')
        })
      );
    }

    return transaction;
  }

  /**
   * Send a tip using Phantom wallet
   * @param {object} params - Tip parameters
   * @param {object} params.solanaWeb3 - @solana/web3.js module
   * @param {object} params.connection - Solana connection
   * @param {object} params.wallet - Phantom wallet adapter
   * @param {string} params.streamerId - Streamer identifier
   * @param {number} params.amountSol - Amount in SOL
   * @param {string} params.memo - Optional memo
   * @returns {Promise<string>} Transaction signature
   */
  async sendTip({ solanaWeb3, connection, wallet, streamerId, amountSol, memo }) {
    // Validate minimum tip
    if (amountSol < 0.001) {
      throw new Error('Minimum tip is 0.001 SOL');
    }

    // Get streamer wallet
    const streamerInfo = await this.getStreamerWallet(streamerId);
    const { LAMPORTS_PER_SOL } = solanaWeb3;
    
    // Build transaction
    const lamports = Math.floor(amountSol * LAMPORTS_PER_SOL);
    const transaction = await this.buildTipTransaction(
      solanaWeb3,
      wallet.getPublicKey(),
      streamerInfo.pubkey,
      lamports,
      memo
    );

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = new solanaWeb3.PublicKey(wallet.getPublicKey());

    // Sign and send
    const signature = await wallet.signAndSendTransaction(transaction);
    
    // Wait for confirmation
    await connection.confirmTransaction(signature, 'confirmed');
    
    console.log('[TipSender] Tip sent:', signature);
    return signature;
  }

  /**
   * Get Solana explorer URL for transaction
   * @param {string} signature - Transaction signature
   * @param {string} cluster - Cluster name (devnet, mainnet-beta)
   * @returns {string} Explorer URL
   */
  getExplorerUrl(signature, cluster = 'devnet') {
    const clusterParam = cluster === 'mainnet-beta' ? '' : `?cluster=${cluster}`;
    return `https://explorer.solana.com/tx/${signature}${clusterParam}`;
  }
}

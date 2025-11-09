/**
 * PhantomWalletAdapter - Client-side utility for Phantom wallet integration
 * Use this in browser environments
 */

export class PhantomWalletAdapter {
  constructor() {
    this.wallet = null;
    this.publicKey = null;
  }

  /**
   * Check if Phantom is installed
   * @returns {boolean}
   */
  isInstalled() {
    return typeof window !== 'undefined' && window.solana && window.solana.isPhantom;
  }

  /**
   * Connect to Phantom wallet
   * @returns {Promise<string>} Public key in base58
   */
  async connect() {
    if (!this.isInstalled()) {
      throw new Error('Phantom wallet is not installed');
    }

    try {
      const response = await window.solana.connect();
      this.wallet = window.solana;
      this.publicKey = response.publicKey.toString();
      console.log('[Phantom] Connected:', this.publicKey);
      return this.publicKey;
    } catch (error) {
      console.error('[Phantom] Connection error:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Phantom
   */
  async disconnect() {
    if (this.wallet) {
      await this.wallet.disconnect();
      this.wallet = null;
      this.publicKey = null;
      console.log('[Phantom] Disconnected');
    }
  }

  /**
   * Sign a message with Phantom
   * @param {string} message - Message to sign
   * @returns {Promise<string>} Signature in base58
   */
  async signMessage(message) {
    if (!this.wallet) {
      throw new Error('Wallet not connected');
    }

    try {
      const encodedMessage = new TextEncoder().encode(message);
      const signedMessage = await this.wallet.signMessage(encodedMessage, 'utf8');
      
      // Convert signature to base58
      const signatureArray = Array.from(signedMessage.signature);
      const signatureBase58 = this.arrayToBase58(signatureArray);
      
      return signatureBase58;
    } catch (error) {
      console.error('[Phantom] Signing error:', error);
      throw error;
    }
  }

  /**
   * Sign and send a transaction
   * @param {Transaction} transaction - Solana transaction
   * @returns {Promise<string>} Transaction signature
   */
  async signAndSendTransaction(transaction) {
    if (!this.wallet) {
      throw new Error('Wallet not connected');
    }

    try {
      const { signature } = await this.wallet.signAndSendTransaction(transaction);
      return signature;
    } catch (error) {
      console.error('[Phantom] Transaction error:', error);
      throw error;
    }
  }

  /**
   * Utility: Convert byte array to base58 (using browser-compatible method)
   */
  arrayToBase58(array) {
    const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let num = BigInt(0);
    
    for (let i = 0; i < array.length; i++) {
      num = num * BigInt(256) + BigInt(array[i]);
    }
    
    let encoded = '';
    while (num > 0) {
      const remainder = num % BigInt(58);
      num = num / BigInt(58);
      encoded = alphabet[Number(remainder)] + encoded;
    }
    
    // Add leading zeros
    for (let i = 0; i < array.length && array[i] === 0; i++) {
      encoded = '1' + encoded;
    }
    
    return encoded;
  }

  /**
   * Get connected public key
   * @returns {string|null}
   */
  getPublicKey() {
    return this.publicKey;
  }
}

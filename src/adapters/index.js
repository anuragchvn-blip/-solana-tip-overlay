/**
 * Database adapter interfaces and implementations
 * 
 * Provides abstraction layer for different storage backends.
 * Implement the StorageAdapter interface to use custom storage.
 */

export { StorageAdapter } from './StorageAdapter.js';
export { LowdbAdapter } from './LowdbAdapter.js';
export { MemoryAdapter } from './MemoryAdapter.js';

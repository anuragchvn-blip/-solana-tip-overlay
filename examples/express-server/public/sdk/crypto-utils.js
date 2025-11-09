// Crypto utilities for browser use
export function createChallengeMessage(streamerId) {
  const timestamp = new Date().toISOString();
  return `Link streamer ${streamerId} at ${timestamp}`;
}

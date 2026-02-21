export const HUB_LIMITS = {
  maxPayloadBytes: 32_000,
  maxDocChars: 12_000,
  maxMessageChars: 480,
  maxMemoryBullets: 10,
  maxMemoryBulletChars: 240,
  maxPairMemoryEntries: 16,
  maxPairMemoryChars: 220,
  maxVoteRationaleChars: 220,
  eventsPerMinute: 90,
  heartbeatsPerMinute: 24
} as const;

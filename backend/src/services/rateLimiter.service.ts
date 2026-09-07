import { redisClient } from '../config/redis';

export interface RateLimitCheckResult {
  allowed: boolean;
  currentCount: number;
  delayUntilNextHourMs?: number;
}

export async function checkAndIncrementHourlyRateLimit(
  keyIdentifier: string,
  hourlyLimit: number
): Promise<RateLimitCheckResult> {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hour = String(now.getUTCHours()).padStart(2, '0');

  const redisKey = `rate_limit:${keyIdentifier}:${year}-${month}-${day}-${hour}`;

  // Increment atomic counter
  const count = await redisClient.incr(redisKey);

  // Set TTL of 2 hours on first increment
  if (count === 1) {
    await redisClient.expire(redisKey, 7200);
  }

  if (count > hourlyLimit) {
    // Calculate delay until top of next hour
    const nextHour = new Date(now);
    nextHour.setUTCHours(now.getUTCHours() + 1, 0, 0, 0);
    const delayUntilNextHourMs = Math.max(1000, nextHour.getTime() - now.getTime());

    return {
      allowed: false,
      currentCount: count,
      delayUntilNextHourMs,
    };
  }

  return {
    allowed: true,
    currentCount: count,
  };
}

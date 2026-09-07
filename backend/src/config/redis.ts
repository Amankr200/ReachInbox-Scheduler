import Redis from 'ioredis';
import { RedisMemoryServer } from 'redis-memory-server';

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

export const redisConnection = {
  host: redisHost,
  port: redisPort,
  maxRetriesPerRequest: null,
};

export const redisClient = new Redis({
  host: redisHost,
  port: redisPort,
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    // Retry up to 5 times then pause
    if (times > 5) return null;
    return Math.min(times * 500, 2000);
  },
});

let memoryServer: RedisMemoryServer | null = null;

export async function ensureRedisServer() {
  try {
    await redisClient.ping();
    console.log(' Connected to external Redis server successfully');
  } catch (err) {
    console.log(' External Redis not detected. Auto-launching Redis Memory Server on port 6379...');
    try {
      memoryServer = new RedisMemoryServer({
        instance: {
          port: redisPort,
        },
      });
      await memoryServer.getHost();
      await memoryServer.getPort();
      console.log(` In-memory Redis Server active on port ${redisPort}`);
      
      // Reconnect redisClient
      await redisClient.connect().catch(() => {});
    } catch (memErr) {
      console.warn(' Redis Memory Server notice:', (memErr as Error).message);
    }
  }
}

redisClient.on('connect', () => {
  console.log(' Connected to Redis queue engine');
});

redisClient.on('error', (err) => {
  // Silent error handler to prevent crashing process
});

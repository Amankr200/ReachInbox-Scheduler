import Redis from 'ioredis';
import { RedisMemoryServer } from 'redis-memory-server';

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const redisPassword = process.env.REDIS_PASSWORD || undefined;

export const redisConnection = {
  host: redisHost,
  port: redisPort,
  password: redisPassword,
  maxRetriesPerRequest: null,
};

export const redisClient = new Redis({
  host: redisHost,
  port: redisPort,
  password: redisPassword,
  maxRetriesPerRequest: null,
  tls: redisHost.includes('upstash.io') ? {} : undefined, // Upstash requires TLS
  retryStrategy(times) {
    if (times > 5) return null;
    return Math.min(times * 500, 2000);
  },
});

let memoryServer: RedisMemoryServer | null = null;

export async function ensureRedisServer() {
  try {
    await redisClient.ping();
    console.log(' Connected to Redis server successfully');
  } catch (err) {
    console.log(' External Redis not detected. Auto-launching Redis Memory Server...');
    try {
      memoryServer = new RedisMemoryServer({
        instance: {
          port: redisPort,
        },
      });
      await memoryServer.getHost();
      await memoryServer.getPort();
      console.log(` In-memory Redis Server active on port ${redisPort}`);

      // Reconnect with local settings (no password/TLS)
      redisClient.disconnect();
      const localRedis = new Redis({
        host: 'localhost',
        port: redisPort,
        maxRetriesPerRequest: null,
      });
      await localRedis.ping();
      console.log(' Connected to in-memory Redis');
    } catch (memErr) {
      console.warn(' Redis Memory Server notice:', (memErr as Error).message);
    }
  }
}

redisClient.on('connect', () => {
  console.log(' Connected to Redis queue engine');
});

redisClient.on('error', () => {
  // Silent error handler to prevent crashing process
});

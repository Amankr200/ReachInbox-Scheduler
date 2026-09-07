import Redis from 'ioredis';
import { RedisMemoryServer } from 'redis-memory-server';

const redisUrl = process.env.REDIS_URL;
const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const redisPassword = process.env.REDIS_PASSWORD || undefined;

const isTlsNeeded =
  Boolean(redisUrl && (redisUrl.startsWith('rediss://') || redisUrl.includes('upstash.io'))) ||
  redisHost.includes('upstash.io') ||
  process.env.REDIS_TLS === 'true';

const tlsOptions = isTlsNeeded ? { rejectUnauthorized: false } : undefined;

export const redisConnection: any = redisUrl
  ? {
      url: redisUrl,
      tls: tlsOptions,
      maxRetriesPerRequest: null,
    }
  : {
      host: redisHost,
      port: redisPort,
      password: redisPassword,
      tls: tlsOptions,
      maxRetriesPerRequest: null,
    };

export const redisClient: Redis = redisUrl
  ? new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      tls: tlsOptions,
      retryStrategy(times) {
        if (times > 10) return null;
        return Math.min(times * 500, 3000);
      },
    })
  : new Redis({
      host: redisHost,
      port: redisPort,
      password: redisPassword,
      maxRetriesPerRequest: null,
      tls: tlsOptions,
      retryStrategy(times) {
        if (times > 10) return null;
        return Math.min(times * 500, 3000);
      },
    });

let memoryServer: RedisMemoryServer | null = null;

export async function ensureRedisServer() {
  try {
    const pong = await redisClient.ping();
    console.log(` Connected to Redis server successfully: ${pong}`);
  } catch (err) {
    console.error(' Redis connection notice:', (err as Error).message);
    if (redisHost === 'localhost' && !redisUrl && process.env.NODE_ENV !== 'production') {
      try {
        console.log(' Auto-launching Redis Memory Server for local development...');
        memoryServer = new RedisMemoryServer({
          instance: {
            port: redisPort,
          },
        });
        await memoryServer.getHost();
        await memoryServer.getPort();
        console.log(` In-memory Redis Server active on port ${redisPort}`);

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
}

redisClient.on('connect', () => {
  console.log(' Connected to Redis queue engine');
});

redisClient.on('error', (err) => {
  console.error(' Redis Client Error:', err.message);
});


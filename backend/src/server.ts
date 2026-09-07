import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
dotenv.config(); // fallback

import express from 'express';
import cors from 'cors';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

import { ensureRedisServer, redisClient } from './config/redis';
import { emailQueue, addEmailJob } from './queues/email.queue';
import { setupEmailWorker } from './workers/email.worker';
import { initElasticsearch } from './config/elasticsearch';
import { getDefaultEtherealTransporter } from './services/ethereal.service';
import { prisma } from './db/prisma';

import authRoutes from './routes/auth.routes';
import emailRoutes from './routes/email.routes';
import slackRoutes from './routes/slack.routes';
import senderRoutes from './routes/sender.routes';

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration — allow localhost, deployed frontend, and vercel preview domains
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL?.replace(/\/+$/, '') || 'http://localhost:5173',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.replace(/\/+$/, '');
      if (
        allowedOrigins.includes(cleanOrigin) ||
        cleanOrigin.endsWith('.vercel.app')
      ) {
        return callback(null, true);
      }
      return callback(null, true); // allow all origins with credentials support
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Bull Board UI setup for real-time queue visibility at /admin/queues
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(emailQueue) as any],
  serverAdapter: serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/slack', slackRoutes);
app.use('/api/senders', senderRoutes);

// Health check endpoint with real-time Redis connection diagnostic
app.get('/health', async (req: express.Request, res: express.Response) => {
  let redisStatus = 'disconnected';
  try {
    const pong = await redisClient.ping();
    redisStatus = pong === 'PONG' ? 'connected' : pong;
  } catch (err) {
    redisStatus = `error: ${(err as Error).message}`;
  }

  res.json({
    status: 'OK',
    service: 'ReachInbox Email Scheduler Backend',
    redis: redisStatus,
    timestamp: new Date().toISOString(),
  });
});

async function main() {
  try {
    // 1. Ensure Redis is up (or auto-start in-memory Redis)
    await ensureRedisServer();

    // 2. Initialize Elasticsearch index
    await initElasticsearch();

    // 3. Warm up default Ethereal test account
    await getDefaultEtherealTransporter();

    // 4. Start BullMQ Worker process
    setupEmailWorker();

    // 5. Reconcile any pending SCHEDULED emails from DB
    try {
      const pendingEmails = await prisma.email.findMany({
        where: { status: 'SCHEDULED' },
      });
      if (pendingEmails.length > 0) {
        console.log(` Found ${pendingEmails.length} pending scheduled email(s). Enqueueing...`);
        for (const email of pendingEmails) {
          const delayMs = Math.max(0, new Date(email.scheduledAt).getTime() - Date.now());
          const job = await addEmailJob(
            {
              emailId: email.id,
              userId: email.userId,
              senderId: email.senderId || undefined,
              recipient: email.recipient,
              subject: email.subject,
              body: email.body,
              delayMs: email.delayMs,
              hourlyLimit: email.hourlyLimit,
            },
            delayMs
          );
          await prisma.email.update({
            where: { id: email.id },
            data: { bullJobId: job.id },
          });
          console.log(` Enqueued email ${email.id} to BullMQ job ${job.id}`);
        }
      }
    } catch (recErr) {
      console.warn(' Email reconciliation notice:', (recErr as Error).message);
    }

    app.listen(PORT, () => {
      console.log(` Server running on http://localhost:${PORT}`);
      console.log(` BullBoard Queue Dashboard live at http://localhost:${PORT}/admin/queues`);
    });
  } catch (error) {
    console.error(' Error starting backend server:', error);
  }
}

main();

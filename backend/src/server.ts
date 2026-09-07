import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
dotenv.config(); // fallback

import express from 'express';
import cors from 'cors';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

import { ensureRedisServer } from './config/redis';
import { emailQueue } from './queues/email.queue';
import { setupEmailWorker } from './workers/email.worker';
import { initElasticsearch } from './config/elasticsearch';
import { getDefaultEtherealTransporter } from './services/ethereal.service';

import authRoutes from './routes/auth.routes';
import emailRoutes from './routes/email.routes';
import slackRoutes from './routes/slack.routes';
import senderRoutes from './routes/sender.routes';

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration — allow both localhost and deployed frontend
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      process.env.FRONTEND_URL || 'http://localhost:5173',
    ],
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Bull Board UI setup for real-time queue visibility at /admin/queues
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(emailQueue)],
  serverAdapter: serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/slack', slackRoutes);
app.use('/api/senders', senderRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'ReachInbox Email Scheduler Backend',
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

    app.listen(PORT, () => {
      console.log(` Server running on http://localhost:${PORT}`);
      console.log(` BullBoard Queue Dashboard live at http://localhost:${PORT}/admin/queues`);
    });
  } catch (error) {
    console.error(' Error starting backend server:', error);
  }
}

main();

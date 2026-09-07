import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

export interface EmailJobData {
  emailId: string;
  userId: string;
  senderId?: string;
  senderEmail?: string;
  recipient: string;
  subject: string;
  body: string;
  delayMs: number;
  hourlyLimit: number;
}

export const EMAIL_QUEUE_NAME = 'email-queue';

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: false,
    removeOnFail: false,
  },
});

export async function addEmailJob(data: EmailJobData, delayMs: number) {
  const job = await emailQueue.add('send-email', data, {
    delay: Math.max(0, delayMs),
    jobId: data.emailId, // Enforces unique BullMQ Job ID matching Email DB ID
  });

  return job;
}

emailQueue.on('error', (err) => {
  console.error(' BullMQ EmailQueue error:', err.message);
});


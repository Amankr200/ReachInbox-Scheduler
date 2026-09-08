import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma';
import { addEmailJob, removeEmailJob, EmailJobAttachment } from '../queues/email.queue';
import { esClient, EMAILS_INDEX } from '../config/elasticsearch';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'reachinbox_super_secret_jwt_key_2026';

function formatEmail(em: any) {
  let parsedAttachments = [];
  if (em.attachments) {
    try {
      parsedAttachments = typeof em.attachments === 'string' ? JSON.parse(em.attachments) : em.attachments;
    } catch {
      parsedAttachments = [];
    }
  }
  return {
    ...em,
    attachments: parsedAttachments,
  };
}

// Middleware to extract logged-in user
async function authMiddleware(req: Request, res: Response, next: Function) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Fallback to default user for easy local API testing
      const defaultUser = await prisma.user.findFirst();
      if (defaultUser) {
        (req as any).user = defaultUser;
        return next();
      }
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) return res.status(401).json({ error: 'User not found' });
    (req as any).user = user;
    next();
  } catch (error) {
    // If invalid token, try fallback default user
    const defaultUser = await prisma.user.findFirst();
    if (defaultUser) {
      (req as any).user = defaultUser;
      return next();
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// 1. Schedule Emails API
router.post('/schedule', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const {
      subject,
      body,
      recipients,
      startTime,
      delay = 2000,
      hourlyLimit = 100,
      senderId,
      attachments,
    } = req.body;

    if (!subject || !body || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'Subject, body, and recipients array are required.' });
    }

    const scheduledDate = startTime ? new Date(startTime) : new Date();
    const delayFromNowMs = Math.max(0, scheduledDate.getTime() - Date.now());

    // Resolve sender email if provided
    let senderEmail = user.email;
    if (senderId) {
      const sender = await prisma.sender.findUnique({ where: { id: senderId } });
      if (sender) senderEmail = sender.email;
    }

    const rawAttachments: EmailJobAttachment[] = Array.isArray(attachments) ? attachments : [];
    const attachmentsJson = rawAttachments.length > 0 ? JSON.stringify(rawAttachments) : null;

    const createdEmails = [];

    // Process recipients
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i].trim();
      if (!recipient) continue;

      // Stagger initial delay based on delay setting so emails don't burst at exact same millisecond
      const jobDelay = delayFromNowMs + i * delay;

      const email = await prisma.email.create({
        data: {
          userId: user.id,
          senderId: senderId || null,
          recipient,
          subject,
          body,
          status: 'SCHEDULED',
          scheduledAt: new Date(Date.now() + jobDelay),
          delayMs: delay,
          hourlyLimit: hourlyLimit,
          attachments: attachmentsJson,
        },
      });

      // Add persistent BullMQ delayed job
      const job = await addEmailJob(
        {
          emailId: email.id,
          userId: user.id,
          senderId,
          senderEmail,
          recipient,
          subject,
          body,
          delayMs: delay,
          hourlyLimit,
          attachments: rawAttachments,
        },
        jobDelay
      );

      // Update bullJobId in DB
      await prisma.email.update({
        where: { id: email.id },
        data: { bullJobId: job.id },
      });

      // Index initial SCHEDULED record in Elasticsearch
      try {
        await esClient.index({
          index: EMAILS_INDEX,
          id: email.id,
          document: {
            id: email.id,
            userId: user.id,
            senderEmail,
            recipient,
            subject,
            body,
            status: 'SCHEDULED',
            scheduledAt: email.scheduledAt,
            createdAt: email.createdAt,
          },
        });
      } catch (esErr) {
        // Silently continue if ES not running
      }

      createdEmails.push(formatEmail(email));
    }

    return res.json({
      success: true,
      message: `Successfully scheduled ${createdEmails.length} emails.`,
      count: createdEmails.length,
      emails: createdEmails,
    });
  } catch (error) {
    console.error(' Error scheduling emails:', error);
    return res.status(500).json({ error: 'Failed to schedule emails' });
  }
});

// 2. Get Scheduled Emails
router.get('/scheduled', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const emails = await prisma.email.findMany({
      where: {
        userId: user.id,
        status: { in: ['SCHEDULED', 'PROCESSING'] },
      },
      orderBy: { scheduledAt: 'asc' },
    });
    return res.json({ emails: emails.map(formatEmail) });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch scheduled emails' });
  }
});

// 3. Get Sent Emails
router.get('/sent', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const emails = await prisma.email.findMany({
      where: {
        userId: user.id,
        status: { in: ['SENT', 'FAILED'] },
      },
      orderBy: { sentAt: 'desc' },
    });
    return res.json({ emails: emails.map(formatEmail) });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch sent emails' });
  }
});

// 4. Toggle Star / Favorite on Email
router.patch('/:id/star', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const email = await prisma.email.findFirst({
      where: { id, userId: user.id },
    });

    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    const updated = await prisma.email.update({
      where: { id },
      data: { isStarred: !email.isStarred },
    });

    try {
      await esClient.update({
        index: EMAILS_INDEX,
        id,
        doc: { isStarred: updated.isStarred },
      });
    } catch (_) {}

    return res.json({ success: true, email: formatEmail(updated) });
  } catch (error) {
    console.error(' Error toggling star:', error);
    return res.status(500).json({ error: 'Failed to toggle star' });
  }
});

// 5. Delete Email
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const email = await prisma.email.findFirst({
      where: { id, userId: user.id },
    });

    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    // Cancel BullMQ job if still in queue
    if (email.bullJobId) {
      await removeEmailJob(email.bullJobId);
    }

    await prisma.email.delete({
      where: { id },
    });

    try {
      await esClient.delete({
        index: EMAILS_INDEX,
        id,
      });
    } catch (_) {}

    return res.json({ success: true, message: 'Email deleted successfully' });
  } catch (error) {
    console.error(' Error deleting email:', error);
    return res.status(500).json({ error: 'Failed to delete email' });
  }
});

// 4. Elasticsearch Email Search API
router.get('/search', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const query = (req.query.q as string || '').trim();

    if (!query) {
      const allEmails = await prisma.email.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      });
      return res.json({ emails: allEmails.map(formatEmail) });
    }

    // Try Elasticsearch search first
    try {
      const esResult = await esClient.search({
        index: EMAILS_INDEX,
        query: {
          bool: {
            must: [
              { term: { userId: user.id } },
              {
                multi_match: {
                  query: query,
                  fields: ['recipient^3', 'subject^2', 'body', 'status'],
                  fuzziness: 'AUTO',
                },
              },
            ],
          },
        },
      });

      const hits = esResult.hits.hits.map((hit) => hit._source);
      if (hits.length > 0) {
        return res.json({ source: 'elasticsearch', emails: hits.map(formatEmail) });
      }
    } catch (esError) {
      console.warn(' Elasticsearch search query failed, falling back to PostgreSQL:', (esError as Error).message);
    }

    // Fallback to PostgreSQL database search
    const dbEmails = await prisma.email.findMany({
      where: {
        userId: user.id,
        OR: [
          { recipient: { contains: query } },
          { subject: { contains: query } },
          { body: { contains: query } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ source: 'postgres', emails: dbEmails.map(formatEmail) });
  } catch (error) {
    console.error(' Search API error:', error);
    return res.status(500).json({ error: 'Search failed' });
  }
});

export default router;

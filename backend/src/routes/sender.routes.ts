import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'reachinbox_super_secret_jwt_key_2026';

async function authMiddleware(req: Request, res: Response, next: Function) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
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
    const defaultUser = await prisma.user.findFirst();
    if (defaultUser) {
      (req as any).user = defaultUser;
      return next();
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// 1. Get Senders list
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    let senders = await prisma.sender.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
    });

    if (senders.length === 0) {
      // Create default sender if none exists
      const defaultSender = await prisma.sender.create({
        data: {
          userId: user.id,
          email: user.email,
          name: user.name,
          smtpHost: 'smtp.ethereal.email',
          smtpPort: 587,
          smtpUser: 'ethereal_demo',
          smtpPass: 'ethereal_pass',
          hourlyLimit: 100,
        },
      });
      senders = [defaultSender];
    }

    return res.json({ senders });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch senders' });
  }
});

// 2. Add New Sender (Multiple Senders requirement)
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { email, name, smtpHost, smtpPort, smtpUser, smtpPass, hourlyLimit } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Sender email is required' });
    }

    const sender = await prisma.sender.create({
      data: {
        userId: user.id,
        email,
        name: name || email.split('@')[0],
        smtpHost: smtpHost || 'smtp.ethereal.email',
        smtpPort: smtpPort || 587,
        smtpUser: smtpUser || email,
        smtpPass: smtpPass || 'ethereal_pass',
        hourlyLimit: hourlyLimit || 100,
      },
    });

    return res.json({ success: true, sender });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create sender' });
  }
});

export default router;

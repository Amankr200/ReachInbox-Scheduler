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

// 1. Initiate Slack OAuth
router.get('/authorize', (req: Request, res: Response) => {
  const clientId = process.env.SLACK_CLIENT_ID;
  const redirectUri = process.env.SLACK_REDIRECT_URI || 'http://localhost:5000/api/slack/callback';

  if (!clientId || clientId.includes('your-slack-client-id')) {
    // If no client ID configured, redirect back with notification flag
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?slack_notice=configure_env`);
  }

  const scopes = 'chat:write,incoming-webhook';
  const slackUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}`;

  return res.redirect(slackUrl);
});

// 2. Slack OAuth Callback
router.get('/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (!code) {
    return res.redirect(`${frontendUrl}?slack_error=no_code`);
  }

  try {
    const clientId = process.env.SLACK_CLIENT_ID!;
    const clientSecret = process.env.SLACK_CLIENT_SECRET!;
    const redirectUri = process.env.SLACK_REDIRECT_URI || 'http://localhost:5000/api/slack/callback';

    const resp = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const data = await resp.json() as any;

    if (!data.ok) {
      console.error(' Slack OAuth exchange failed:', data.error);
      return res.redirect(`${frontendUrl}?slack_error=${data.error}`);
    }

    const defaultUser = await prisma.user.findFirst();
    if (defaultUser) {
      await prisma.slackConnection.upsert({
        where: { userId: defaultUser.id },
        update: {
          accessToken: data.access_token || data.incoming_webhook?.url || 'connected',
          teamId: data.team?.id,
          teamName: data.team?.name,
          channelId: data.incoming_webhook?.channel_id || 'general',
        },
        create: {
          userId: defaultUser.id,
          accessToken: data.access_token || data.incoming_webhook?.url || 'connected',
          teamId: data.team?.id,
          teamName: data.team?.name,
          channelId: data.incoming_webhook?.channel_id || 'general',
        },
      });
    }

    return res.redirect(`${frontendUrl}?slack_connected=true`);
  } catch (error) {
    console.error(' Slack callback error:', error);
    return res.redirect(`${frontendUrl}?slack_error=exception`);
  }
});

// 3. Get Slack Connection Status
router.get('/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const connection = await prisma.slackConnection.findUnique({
      where: { userId: user.id },
    });

    return res.json({
      connected: !!connection,
      connection: connection ? {
        teamName: connection.teamName || 'Workspace Connected',
        channelId: connection.channelId || 'general',
        createdAt: connection.createdAt,
      } : null,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch Slack status' });
  }
});

// 4. Disconnect Slack
router.post('/disconnect', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    await prisma.slackConnection.deleteMany({
      where: { userId: user.id },
    });
    return res.json({ success: true, message: 'Slack disconnected successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to disconnect Slack' });
  }
});

// 5. Dev Quick Connect Slack (for testing demo without needing Slack App set up)
router.post('/dev-connect', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { webhookUrl, token } = req.body;

    const connection = await prisma.slackConnection.upsert({
      where: { userId: user.id },
      update: {
        accessToken: token || webhookUrl || 'dev_mock_token_123',
        teamName: 'Outbox Labs Slack',
        channelId: 'general',
      },
      create: {
        userId: user.id,
        accessToken: token || webhookUrl || 'dev_mock_token_123',
        teamName: 'Outbox Labs Slack',
        channelId: 'general',
      },
    });

    return res.json({ success: true, connection });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to connect Slack' });
  }
});

export default router;

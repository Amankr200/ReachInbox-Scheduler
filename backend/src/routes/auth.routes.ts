import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'reachinbox_super_secret_jwt_key_2026';

// Helper to generate JWT
function generateToken(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

// Dev / Demo quick login endpoint (creates or gets default demo user)
router.post('/dev-login', async (req: Request, res: Response) => {
  try {
    const { name, email, avatar } = req.body;
    const userEmail = email || 'oliver.brown@reachinbox.ai';
    const userName = name || 'Oliver Brown';
    const userAvatar = avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

    let user = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          googleId: `dev_${Date.now()}`,
          email: userEmail,
          name: userName,
          avatar: userAvatar,
        },
      });

      // Seed a default sender for this user
      await prisma.sender.create({
        data: {
          userId: user.id,
          email: userEmail,
          name: userName,
          smtpHost: 'smtp.ethereal.email',
          smtpPort: 587,
          smtpUser: 'ethereal_user',
          smtpPass: 'ethereal_pass',
          hourlyLimit: 100,
        },
      });
    }

    const token = generateToken(user.id);
    return res.json({
      success: true,
      token,
      user,
    });
  } catch (error) {
    console.error('Dev login error:', error);
    return res.status(500).json({ error: 'Failed to authenticate user' });
  }
});

// Google OAuth initiate
router.get('/google', (req: Request, res: Response) => {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';

  if (!googleClientId || googleClientId.includes('your-google-client-id')) {
    // If no live Google client ID, redirect to frontend with dev-login flag
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?auth_mode=dev`);
  }

  const scope = encodeURIComponent('email profile');
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=${scope}`;

  return res.redirect(googleAuthUrl);
});

// Google OAuth callback
router.get('/google/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (!code) {
    return res.redirect(`${frontendUrl}?auth_error=no_code`);
  }

  try {
    const googleClientId = process.env.GOOGLE_CLIENT_ID!;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    const redirectUri = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json() as { access_token?: string };
    if (!tokenData.access_token) {
      return res.redirect(`${frontendUrl}?auth_error=token_exchange_failed`);
    }

    // Fetch user profile from Google
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await userRes.json() as { id: string; email: string; name: string; picture?: string };

    let user = await prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          googleId: profile.id,
          email: profile.email,
          name: profile.name,
          avatar: profile.picture,
        },
      });

      // Create default sender
      await prisma.sender.create({
        data: {
          userId: user.id,
          email: profile.email,
          name: profile.name,
          smtpHost: 'smtp.ethereal.email',
          smtpPort: 587,
          smtpUser: 'ethereal_user',
          smtpPass: 'ethereal_pass',
        },
      });
    }

    const jwtToken = generateToken(user.id);
    return res.redirect(`${frontendUrl}?token=${jwtToken}`);
  } catch (error) {
    console.error(' Google OAuth callback error:', error);
    return res.redirect(`${frontendUrl}?auth_error=failed`);
  }
});

// Current user profile route
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        slackConnections: true,
        senders: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

export default router;

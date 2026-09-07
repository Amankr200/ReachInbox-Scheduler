import { prisma } from '../db/prisma';

export async function sendSlackRateLimitNotification(
  userId: string,
  senderEmail: string,
  hourlyLimit: number,
  currentCount: number
) {
  try {
    const slackConn = await prisma.slackConnection.findUnique({
      where: { userId },
    });

    if (!slackConn || !slackConn.accessToken) {
      // User hasn't connected Slack; do nothing (no crash)
      return;
    }

    const messageText = ` *ReachInbox Rate Limit Alert*\n\n` +
      `• *Sender:* \`${senderEmail}\`\n` +
      `• *Hourly Limit:* ${hourlyLimit} emails/hour\n` +
      `• *Emails Sent This Hour:* ${currentCount}\n` +
      `• *Action:* Hourly rate limit reached! Pending emails are automatically delayed to the next hour window.`;

    // Send to default channel or incoming webhook / chat.postMessage API
    const channel = slackConn.channelId || 'general';

    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Bearer ${slackConn.accessToken}`,
      },
      body: JSON.stringify({
        channel: channel,
        text: messageText,
      }),
    });

    const data = await response.json() as { ok: boolean; error?: string };
    if (data.ok) {
      console.log(` Live Slack rate limit alert sent to channel '${channel}' for sender ${senderEmail}`);
    } else {
      console.warn(` Slack API notification attempt returned error: ${data.error}`);
    }
  } catch (error) {
    console.error(' Error sending Slack rate limit notification:', (error as Error).message);
  }
}

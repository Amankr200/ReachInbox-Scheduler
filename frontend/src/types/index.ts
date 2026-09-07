export interface User {
  id: string;
  googleId?: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface Sender {
  id: string;
  email: string;
  name?: string;
  hourlyLimit: number;
}

export interface EmailAttachment {
  filename: string;
  contentType: string;
  size: number;
  content?: string;
}

export interface Email {
  id: string;
  userId: string;
  senderId?: string;
  senderEmail?: string;
  recipient: string;
  subject: string;
  body: string;
  status: 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED';
  scheduledAt: string;
  sentAt?: string;
  createdAt: string;
  isStarred?: boolean;
  attachments?: EmailAttachment[];
}

export interface SlackStatus {
  connected: boolean;
  connection?: {
    teamName: string;
    channelId: string;
    createdAt: string;
  } | null;
}

import axios from 'axios';
import { Email, Sender, User, SlackStatus } from '../types';

const API_BASE = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function getMe(): Promise<{ user: User }> {
  const res = await api.get('/auth/me');
  return res.data;
}

export async function devLogin(email?: string, name?: string): Promise<{ token: string; user: User }> {
  const res = await api.post('/auth/dev-login', { email, name });
  return res.data;
}

export async function scheduleEmails(payload: {
  subject: string;
  body: string;
  recipients: string[];
  startTime?: string;
  delay?: number;
  hourlyLimit?: number;
  senderId?: string;
}): Promise<{ count: number; emails: Email[] }> {
  const res = await api.post('/emails/schedule', payload);
  return res.data;
}

export async function getScheduledEmails(): Promise<{ emails: Email[] }> {
  const res = await api.get('/emails/scheduled');
  return res.data;
}

export async function getSentEmails(): Promise<{ emails: Email[] }> {
  const res = await api.get('/emails/sent');
  return res.data;
}

export async function searchEmails(query: string): Promise<{ source?: string; emails: Email[] }> {
  const res = await api.get(`/emails/search?q=${encodeURIComponent(query)}`);
  return res.data;
}

export async function getSenders(): Promise<{ senders: Sender[] }> {
  const res = await api.get('/senders');
  return res.data;
}

export async function getSlackStatus(): Promise<SlackStatus> {
  const res = await api.get('/slack/status');
  return res.data;
}

export async function devConnectSlack(): Promise<{ success: boolean }> {
  const res = await api.post('/slack/dev-connect');
  return res.data;
}

export async function disconnectSlack(): Promise<{ success: boolean }> {
  const res = await api.post('/slack/disconnect');
  return res.data;
}

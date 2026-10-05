import express, { Request, Response, NextFunction } from 'express';
import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'node:crypto';
import { promises as fs } from 'node:fs';
import * as fsSync from 'node:fs';
import path from 'node:path';
import { lookup } from 'node:dns/promises';
import net from 'node:net';
import dotenv from 'dotenv';
import https from 'node:https';

dotenv.config();

export const webhookRouter = express.Router();

export interface WebhookConfig {
  id: string;
  name: string;
  type: 'slack' | 'teams' | 'custom';
  url: string;
  notifyOnPass: boolean;
  notifyOnFail: boolean;
  notifyOnSelfHeal: boolean;
  enabled: boolean;
}

type EventStatus = 'passed' | 'failed' | 'healed';
type StoredData = { version: 1; iv: string; tag: string; data: string };
const storagePath = path.resolve(process.env.WEBHOOK_STORAGE_PATH || 'data/webhooks.enc');
const production = process.env.NODE_ENV === 'production';

function loadEncryptionKey(): Buffer {
  const configured = process.env.WEBHOOK_ENCRYPTION_KEY;
  if (configured && /^[a-f0-9]{64}$/i.test(configured)) return Buffer.from(configured, 'hex');
  if (production) throw new Error('WEBHOOK_ENCRYPTION_KEY must be set to 64 hex characters in production.');
  if (configured) throw new Error('WEBHOOK_ENCRYPTION_KEY must be 64 hex characters.');
  const keyPath = path.join(path.dirname(storagePath), '.webhook-dev.key');
  try {
    const key = fsSync.readFileSync(keyPath);
    if (key.length === 32) return key;
  } catch { /* create a development-only key below */ }
  const key = randomBytes(32);
  fsSync.mkdirSync(path.dirname(keyPath), { recursive: true, mode: 0o700 });
  fsSync.writeFileSync(keyPath, key, { mode: 0o600, flag: 'wx' });
  return key;
}

const encryptionKey = loadEncryptionKey();
function encodeStore(value: WebhookConfig[]): StoredData {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return { version: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') };
}
function decodeStore(input: StoredData): WebhookConfig[] {
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey, Buffer.from(input.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(input.tag, 'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(input.data, 'base64')), decipher.final()]).toString('utf8'));
}

let webhooks: WebhookConfig[] = [];
try {
  const raw = fsSync.readFileSync(storagePath, 'utf8');
  const stored = JSON.parse(raw) as StoredData;
  if (stored.version !== 1) throw new Error('Unsupported webhook storage version.');
  webhooks = decodeStore(stored);
} catch (error: any) {
  if (error?.code !== 'ENOENT') throw new Error(`Could not read encrypted webhook configuration at ${storagePath}: ${error.message}`);
}

let writeQueue = Promise.resolve();
function persist(next: WebhookConfig[]) {
  const operation = writeQueue.then(async () => {
    await fs.mkdir(path.dirname(storagePath), { recursive: true, mode: 0o700 });
    const temporaryPath = `${storagePath}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`;
    await fs.writeFile(temporaryPath, JSON.stringify(encodeStore(next)), { mode: 0o600, flag: 'wx' });
    await fs.rename(temporaryPath, storagePath);
  });
  writeQueue = operation.catch(() => undefined);
  return operation;
}

function apiAuth(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.APP_API_TOKEN;
  if (!expected) {
    if (production) return res.status(503).json({ error: 'Webhook API is not configured. Set APP_API_TOKEN.' });
    return next();
  }
  const supplied = req.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  if (suppliedBytes.length !== expectedBytes.length || !timingSafeEqual(suppliedBytes, expectedBytes)) {
    return res.status(401).json({ error: 'A valid webhook API token is required.' });
  }
  next();
}
webhookRouter.use('/webhooks', apiAuth);

const requestWindows = new Map<string, { startedAt: number; count: number }>();
function limitWebhookWrites(req: Request, res: Response, next: NextFunction) {
  const now = Date.now();
  if (requestWindows.size > 10_000) {
    for (const [address, state] of requestWindows) if (now - state.startedAt >= 60_000) requestWindows.delete(address);
  }
  const key = req.ip || 'unknown';
  const window = requestWindows.get(key);
  if (!window || now - window.startedAt >= 60_000) requestWindows.set(key, { startedAt: now, count: 1 });
  else if (window.count >= 60) return res.status(429).json({ error: 'Webhook API rate limit reached. Try again in a minute.' });
  else window.count += 1;
  next();
}
webhookRouter.post('/webhooks', limitWebhookWrites);
webhookRouter.post('/webhooks/test-dispatch', limitWebhookWrites);
webhookRouter.post('/webhooks/dispatch', limitWebhookWrites);

function validateConfig(input: unknown): WebhookConfig[] | null {
  if (!Array.isArray(input) || input.length > 50) return null;
  const ids = new Set<string>();
  const result: WebhookConfig[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') return null;
    const value = raw as Record<string, unknown>;
    if (typeof value.id !== 'string' || !/^[\w-]{1,80}$/.test(value.id) || ids.has(value.id)) return null;
    if (typeof value.name !== 'string' || !value.name.trim() || value.name.length > 100) return null;
    if (!['slack', 'teams', 'custom'].includes(String(value.type))) return null;
    if (typeof value.url !== 'string' || value.url.length > 2048) return null;
    if (!['notifyOnPass', 'notifyOnFail', 'notifyOnSelfHeal', 'enabled'].every(k => typeof value[k] === 'boolean')) return null;
    ids.add(value.id);
    result.push({
      id: value.id, name: value.name.trim(), type: value.type as WebhookConfig['type'], url: value.url.trim(),
      notifyOnPass: value.notifyOnPass as boolean, notifyOnFail: value.notifyOnFail as boolean,
      notifyOnSelfHeal: value.notifyOnSelfHeal as boolean, enabled: value.enabled as boolean
    });
  }
  return result;
}

function ipv4Private(address: string) {
  const n = address.split('.').map(Number);
  return n[0] === 0 || n[0] === 10 || n[0] === 127 || (n[0] === 169 && n[1] === 254) ||
    (n[0] === 172 && n[1] >= 16 && n[1] <= 31) || (n[0] === 192 && (n[1] === 0 || n[1] === 168)) ||
    (n[0] === 198 && (n[1] === 18 || n[1] === 19)) || (n[0] === 203 && n[1] === 0 && n[2] === 113) ||
    (n[0] === 100 && n[1] >= 64 && n[1] <= 127) || n[0] >= 224;
}
function privateAddress(address: string) {
  const family = net.isIP(address);
  if (family === 4) return ipv4Private(address);
  if (family !== 6) return true;
  const normalized = address.toLowerCase();
  const mapped = normalized.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) return ipv4Private(mapped[1]);
  return normalized === '::' || normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') ||
    normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb') ||
    normalized.startsWith('::ffff:127.') || normalized.startsWith('::ffff:10.') || normalized.startsWith('::ffff:192.168.');
}

async function validateDestination(rawUrl: string, type: WebhookConfig['type']) {
  let url: URL;
  try { url = new URL(rawUrl); } catch { throw new Error('Enter a valid webhook URL.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port && url.port !== '443') throw new Error('Webhook URLs must use HTTPS on the standard port.');
  if (type === 'slack' && !(url.hostname === 'hooks.slack.com' && url.pathname.startsWith('/services/'))) throw new Error('Use a Slack incoming webhook URL from hooks.slack.com.');
  const teamsWorkflowHost = url.hostname.endsWith('.logic.azure.com') || url.hostname === 'logic.azure.com' || url.hostname.endsWith('.api.powerplatform.com') || url.hostname === 'api.powerplatform.com';
  const teamsConnectorHost = url.hostname === 'outlook.office.com' || url.hostname.endsWith('.webhook.office.com') || url.hostname === 'webhook.office.com';
  if (type === 'teams' && !(teamsWorkflowHost || teamsConnectorHost)) throw new Error('Use a Microsoft Teams incoming webhook or Workflows URL.');
  let pinnedAddress: { address: string; family: number } | undefined;
  if (type === 'custom') {
    const addresses = net.isIP(url.hostname) ? [{ address: url.hostname, family: net.isIP(url.hostname) }] : await lookup(url.hostname, { all: true, verbatim: true });
    if (!addresses.length || addresses.some(({ address }) => privateAddress(address))) throw new Error('Custom webhooks must resolve to a public network address.');
    pinnedAddress = addresses[0];
  }
  return { url, pinnedAddress };
}

function makePayload(hook: WebhookConfig, event: Record<string, unknown>) {
  const status = String(event.status || 'test');
  const testCaseId = String(event.testCaseId || 'Webhook configuration');
  const feature = String(event.feature || 'Automation');
  const details = String(event.details || 'No additional details.').slice(0, 2000);
  const duration = Number.isFinite(Number(event.durationMs)) ? `${Math.max(0, Number(event.durationMs))}ms` : 'Not provided';
  const emoji = status === 'passed' ? '✅' : status === 'healed' ? '🪄' : status === 'failed' ? '❌' : '🔌';
  const title = status === 'test' ? 'Webhook Configuration Test' : 'Test Automation Execution Report';
  if (hook.type === 'custom') return { event: status === 'test' ? 'webhook.test' : 'test.execution', testCaseId, feature, status, durationMs: Number(event.durationMs) || null, details, sentAt: new Date().toISOString() };
  if (hook.type === 'slack') return {
    text: `${emoji} AutoTest Architect: ${testCaseId} — ${status === 'test' ? 'webhook configuration test' : `${feature} ${status}`}`,
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: `${emoji} ${title}`, emoji: true } },
      { type: 'section', fields: [
        { type: 'mrkdwn', text: `*Test Case:*\n${testCaseId}` }, { type: 'mrkdwn', text: `*Feature:*\n${feature}` },
        { type: 'mrkdwn', text: `*Status:*\n${status.toUpperCase()}` }, { type: 'mrkdwn', text: `*Duration:*\n${status === 'test' ? 'Not applicable' : duration}` }
      ] }, { type: 'section', text: { type: 'mrkdwn', text: `*Details:*\n${details}` } }
    ]
  };
  if (hook.type === 'teams' && (urlWorkflowHost(hook.url))) {
    return { text: `${emoji} AutoTest Architect · ${testCaseId} · ${feature} · ${status.toUpperCase()} · ${status === 'test' ? 'Webhook configuration test' : details}` };
  }
  return {
    '@type': 'MessageCard', '@context': 'http://schema.org/extensions',
    themeColor: status === 'passed' ? '168A5B' : status === 'healed' ? '6941C6' : 'C0392B',
    summary: `${title}: ${testCaseId}`,
    sections: [{ activityTitle: `${emoji} ${title}`, activitySubtitle: `${testCaseId} · ${feature}`, facts: [
      { name: 'Status', value: status.toUpperCase() }, { name: 'Duration', value: status === 'test' ? 'Not applicable' : duration }, { name: 'Details', value: details }
    ], markdown: true }]
  };
}

function urlWorkflowHost(rawUrl: string) {
  const hostname = new URL(rawUrl).hostname;
  return hostname.endsWith('.logic.azure.com') || hostname === 'logic.azure.com' || hostname.endsWith('.api.powerplatform.com') || hostname === 'api.powerplatform.com';
}

async function dispatch(hook: WebhookConfig, event: Record<string, unknown>) {
  const { url, pinnedAddress } = await validateDestination(hook.url, hook.type);
  const body = JSON.stringify(makePayload(hook, event));
  const status = await new Promise<number>((resolve, reject) => {
    const request = https.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'User-Agent': 'AutoTestArchitect-Webhook/1.0' },
      ...(pinnedAddress ? { lookup: ((_hostname: string, _options: unknown, callback: (error: NodeJS.ErrnoException | null, address: string, family: number) => void) => callback(null, pinnedAddress.address, pinnedAddress.family)) as any } : {})
    }, response => {
      response.resume();
      response.on('end', () => resolve(response.statusCode || 0));
    });
    request.setTimeout(8000, () => request.destroy(new Error('Webhook request timed out.')));
    request.on('error', reject);
    request.end(body);
  });
  if (status >= 300 && status < 400) throw new Error('Webhook redirects are not followed. Use the provider URL directly.');
  if (status < 200 || status >= 300) throw new Error(`Provider returned HTTP ${status}.`);
  return { success: true, status };
}

webhookRouter.get('/webhooks', (_req, res) => res.json({ success: true, webhooks }));

webhookRouter.post('/webhooks', async (req, res) => {
  const updated = validateConfig(req.body?.webhooks);
  if (!updated) return res.status(400).json({ error: 'Invalid webhook configuration. Check required fields, types, and limits.' });
  try {
    await persist(updated);
    webhooks = updated;
    return res.json({ success: true, webhooks });
  } catch (error) {
    console.error('Could not persist webhook configuration:', error);
    return res.status(500).json({ error: 'Could not securely save webhook configuration.' });
  }
});

webhookRouter.post('/webhooks/test-dispatch', async (req, res) => {
  const hook = webhooks.find(item => item.id === req.body?.webhookId);
  if (!hook) return res.status(404).json({ error: 'Webhook not found.' });
  if (!hook.enabled) return res.status(400).json({ error: 'Enable this endpoint before sending a test notification.' });
  try {
    const result = await dispatch(hook, { ...req.body, status: 'test' });
    return res.json({ success: true, delivered: true, provider: hook.type, externalStatus: `Delivered (HTTP ${result.status}).` });
  } catch (error: any) {
    return res.status(502).json({ success: false, delivered: false, provider: hook.type, externalStatus: error.message || 'Webhook delivery failed.' });
  }
});

// CI runners and trusted integrations post actual execution events here.
webhookRouter.post('/webhooks/dispatch', async (req, res) => {
  const { status } = req.body || {};
  if (!(['passed', 'failed', 'healed'] as string[]).includes(status)) return res.status(400).json({ error: 'status must be passed, failed, or healed.' });
  const targets = webhooks.filter(hook => hook.enabled && (
    status === 'passed' ? hook.notifyOnPass : status === 'failed' ? hook.notifyOnFail : hook.notifyOnSelfHeal
  ));
  if (targets.length === 0) return res.status(409).json({ success: false, attempted: 0, delivered: 0, error: 'No enabled webhook matches this event.' });
  const results = await Promise.all(targets.map(async hook => {
    try { const result = await dispatch(hook, req.body); return { id: hook.id, success: true, status: result.status }; }
    catch (error: any) { return { id: hook.id, success: false, error: error.message || 'Webhook delivery failed.' }; }
  }));
  const delivered = results.filter(result => result.success).length;
  return res.status(results.some(result => !result.success) ? 502 : 200).json({ success: results.every(result => result.success), attempted: results.length, delivered, results });
});

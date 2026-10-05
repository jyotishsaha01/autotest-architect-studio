import express, { Request, Response } from 'express';

export const webhookRouter = express.Router();

export interface WebhookConfig {
  id: string;
  name: string;
  type: 'slack' | 'teams' | 'custom';
  url: string;
  channel?: string;
  notifyOnPass: boolean;
  notifyOnFail: boolean;
  notifyOnSelfHeal: boolean;
  enabled: boolean;
}

// In-memory webhooks store
let webhooks: WebhookConfig[] = [
  {
    id: 'webhook-1',
    name: 'QA Core Alerts (#qa-automation)',
    type: 'slack',
    url: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX',
    channel: '#qa-automation',
    notifyOnPass: true,
    notifyOnFail: true,
    notifyOnSelfHeal: true,
    enabled: true,
  },
  {
    id: 'webhook-2',
    name: 'Release Engineering (MS Teams)',
    type: 'teams',
    url: 'https://outlook.office.com/webhook/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx@xxxxxxxx/IncomingWebhook/xxxxxxxx/xxxxxxxx',
    channel: 'Release Squad',
    notifyOnPass: false,
    notifyOnFail: true,
    notifyOnSelfHeal: true,
    enabled: false,
  }
];

// Get webhooks
webhookRouter.get('/webhooks', (req: Request, res: Response) => {
  res.json({ success: true, webhooks });
});

// Update or save webhooks
webhookRouter.post('/webhooks', (req: Request, res: Response) => {
  const updatedWebhooks: WebhookConfig[] = req.body.webhooks;
  if (Array.isArray(updatedWebhooks)) {
    webhooks = updatedWebhooks;
    res.json({ success: true, webhooks });
  } else {
    res.status(400).json({ error: 'Invalid webhooks array payload' });
  }
});

// Trigger test notification (or test ping)
webhookRouter.post('/webhooks/test-dispatch', async (req: Request, res: Response) => {
  try {
    const { webhookId, eventType, testCaseId, feature, status, durationMs, details } = req.body;
    const targetWebhook = webhooks.find(w => w.id === webhookId) || webhooks[0];

    if (!targetWebhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    // Build payload according to Slack Block Kit or MS Teams MessageCard format
    let payload: any;
    const statusEmoji = status === 'passed' ? '✅' : status === 'healed' ? '🪄' : '❌';

    if (targetWebhook.type === 'slack') {
      payload = {
        channel: targetWebhook.channel || '#qa-automation',
        text: `${statusEmoji} AutoTest Architect: ${testCaseId} - ${feature} execution completed (${status.toUpperCase()})`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `${statusEmoji} Test Automation Execution Report`,
              emoji: true
            }
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Test Case:*\n${testCaseId}` },
              { type: 'mrkdwn', text: `*Feature:*\n${feature || 'Core Flows'}` },
              { type: 'mrkdwn', text: `*Outcome:*\n\`${status.toUpperCase()}\`` },
              { type: 'mrkdwn', text: `*Duration:*\n${durationMs || 420}ms` }
            ]
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Diagnostics & Context:*\n${details || 'All 5 automated steps verified against live DOM.'}`
            }
          }
        ]
      };
    } else {
      // Microsoft Teams Connector Card
      payload = {
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extensions',
        themeColor: status === 'passed' ? '0076D7' : status === 'healed' ? '8957E5' : 'D83B01',
        summary: `AutoTest Notification for ${testCaseId}`,
        sections: [
          {
            activityTitle: `${statusEmoji} AutoTest Architect Execution Result`,
            activitySubtitle: `Test ${testCaseId} · ${feature}`,
            facts: [
              { name: 'Status', value: status.toUpperCase() },
              { name: 'Duration', value: `${durationMs || 420}ms` },
              { name: 'Diagnostics', value: details || 'Headless browser execution completed.' }
            ],
            markdown: true
          }
        ]
      };
    }

    // Attempt real HTTP POST if valid external URL is supplied
    let externalSuccess = false;
    let externalStatus = 'Simulated dispatch (mock webhook endpoint)';

    if (targetWebhook.url && targetWebhook.url.startsWith('https://hooks.')) {
      try {
        const fetchRes = await fetch(targetWebhook.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        externalSuccess = fetchRes.ok;
        externalStatus = `Delivered to webhook provider (HTTP ${fetchRes.status})`;
      } catch (err: any) {
        externalStatus = `Network dispatch error: ${err.message}`;
      }
    }

    res.json({
      success: true,
      delivered: true,
      provider: targetWebhook.type,
      externalSuccess,
      externalStatus,
      sentPayload: payload
    });
  } catch (err: any) {
    console.error('Error dispatching webhook notification:', err);
    res.status(500).json({ error: err.message || 'Webhook dispatch failed' });
  }
});

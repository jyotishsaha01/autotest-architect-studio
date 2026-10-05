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

// In-memory configuration store. Use a persistent secret store before deploying multiple instances.
let webhooks: WebhookConfig[] = [];

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
    const targetWebhook = webhooks.find(w => w.id === webhookId);

    if (!targetWebhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }
    if (!targetWebhook.enabled) {
      return res.status(400).json({ error: 'Enable this endpoint before sending a test notification.' });
    }

    // Build payload according to Slack Block Kit or MS Teams MessageCard format
    let payload: any;
    const isConfigurationTest = status === 'test';
    const statusEmoji = isConfigurationTest ? '🔌' : status === 'passed' ? '✅' : status === 'healed' ? '🪄' : '❌';

    if (targetWebhook.type === 'slack') {
      payload = {
        channel: targetWebhook.channel || '#qa-automation',
        text: isConfigurationTest
          ? `${statusEmoji} AutoTest Architect webhook configuration test for ${testCaseId}`
          : `${statusEmoji} AutoTest Architect: ${testCaseId} - ${feature} execution completed (${status.toUpperCase()})`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: isConfigurationTest ? `${statusEmoji} Webhook Configuration Test` : `${statusEmoji} Test Automation Execution Report`,
              emoji: true
            }
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Test Case:*\n${testCaseId}` },
              { type: 'mrkdwn', text: `*Feature:*\n${feature || 'Core Flows'}` },
              { type: 'mrkdwn', text: `*Outcome:*\n\`${isConfigurationTest ? 'TEST EVENT' : status.toUpperCase()}\`` },
              { type: 'mrkdwn', text: `*Duration:*\n${isConfigurationTest ? 'Not applicable' : `${durationMs}ms`}` }
            ]
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Details:*\n${details || (isConfigurationTest ? 'Webhook delivery configuration test.' : 'No additional details provided.')}`
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
            activityTitle: isConfigurationTest ? `${statusEmoji} Webhook Configuration Test` : `${statusEmoji} AutoTest Architect Execution Result`,
            activitySubtitle: `Test ${testCaseId} · ${feature}`,
            facts: [
              { name: 'Status', value: status.toUpperCase() },
              { name: 'Duration', value: isConfigurationTest ? 'Not applicable' : `${durationMs}ms` },
              { name: 'Details', value: details || (isConfigurationTest ? 'Webhook delivery configuration test.' : 'No additional details provided.') }
            ],
            markdown: true
          }
        ]
      };
    }

    // Attempt real HTTP POST if valid external URL is supplied
    let externalSuccess = false;
    let externalStatus = 'No notification was sent.';
    let supportedDestination = false;
    try {
      const destination = new URL(targetWebhook.url);
      supportedDestination = destination.protocol === 'https:' && (
        (targetWebhook.type === 'slack' && destination.hostname === 'hooks.slack.com' && destination.pathname.startsWith('/services/')) ||
        (targetWebhook.type === 'teams' && (destination.hostname === 'outlook.office.com' || destination.hostname.endsWith('.webhook.office.com')))
      );
    } catch {
      supportedDestination = false;
    }

    if (!supportedDestination) {
      externalStatus = 'Enter a valid Slack or Teams HTTPS incoming webhook URL. No notification was sent.';
    } else {
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
      success: externalSuccess,
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

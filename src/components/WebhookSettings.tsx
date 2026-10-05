import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Send, 
  Plus, 
  Trash2, 
  Check, 
  AlertCircle, 
  Radio, 
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { TestIR } from '../types/testAutomation';

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

interface WebhookSettingsProps {
  currentTestIR: TestIR;
}

export const WebhookSettings: React.FC<WebhookSettingsProps> = ({ currentTestIR }) => {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ webhookId: string; success: boolean; message: string; payload?: any } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    try {
      const res = await fetch('/api/webhooks');
      const data = await res.json();
      if (data.webhooks) {
        setWebhooks(data.webhooks);
      }
    } catch (err) {
      console.error('Failed to load webhooks', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhooks })
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddWebhook = () => {
    const newHook: WebhookConfig = {
      id: `webhook-${Date.now()}`,
      name: 'New Alert Endpoint',
      type: 'slack',
      url: 'https://hooks.slack.com/services/T...',
      channel: '#qa-status',
      notifyOnPass: true,
      notifyOnFail: true,
      notifyOnSelfHeal: true,
      enabled: true
    };
    setWebhooks([...webhooks, newHook]);
  };

  const handleDelete = (id: string) => {
    setWebhooks(webhooks.filter(w => w.id !== id));
  };

  const handleUpdate = (id: string, updates: Partial<WebhookConfig>) => {
    setWebhooks(webhooks.map(w => w.id === id ? { ...w, ...updates } : w));
  };

  const handleTestDispatch = async (webhook: WebhookConfig) => {
    setIsTesting(webhook.id);
    setTestResult(null);

    try {
      const res = await fetch('/api/webhooks/test-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookId: webhook.id,
          testCaseId: currentTestIR.testCaseId,
          feature: currentTestIR.feature,
          status: 'passed',
          durationMs: 385,
          details: 'All 5 automated steps executed cleanly against headless Chromium.'
        })
      });

      const data = await res.json();
      setTestResult({
        webhookId: webhook.id,
        success: data.success,
        message: data.externalStatus || 'Test alert payload structured and dispatched.',
        payload: data.sentPayload
      });
    } catch (err: any) {
      setTestResult({
        webhookId: webhook.id,
        success: false,
        message: err.message || 'Dispatch failure'
      });
    } finally {
      setIsTesting(null);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-semibold text-slate-900">
              Notification Webhooks (Slack &amp; Microsoft Teams)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure incoming webhooks to broadcast automated regression test results, failure traces, and autonomous self-healing updates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAddWebhook}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Webhook
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg text-xs font-medium transition-colors shadow-xs"
          >
            {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : saveSuccess ? <Check className="w-3.5 h-3.5" /> : null}
            {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Configuration'}
          </button>
        </div>
      </div>

      {/* Webhook Configuration Cards */}
      <div className="p-6 space-y-6">
        {webhooks.length === 0 && (
          <div className="py-12 text-center text-slate-400">
            <MessageSquare className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-[1.5]" />
            <p className="text-xs font-medium text-slate-600">No Webhook Endpoints Configured</p>
            <p className="text-2xs text-slate-400 mt-0.5">
              Click 'Add Webhook' above to connect Slack or Microsoft Teams channels.
            </p>
          </div>
        )}

        {webhooks.map((hook) => (
          <div
            key={hook.id}
            className={`border rounded-xl p-5 space-y-4 transition-all ${
              hook.enabled ? 'border-slate-200 bg-white shadow-2xs' : 'border-slate-200/60 bg-slate-50/50 opacity-75'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={hook.enabled}
                  onChange={(e) => handleUpdate(hook.id, { enabled: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <input
                  type="text"
                  value={hook.name}
                  onChange={(e) => handleUpdate(hook.id, { name: e.target.value })}
                  className="text-xs font-semibold text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none px-1"
                />
              </div>

              <div className="flex items-center gap-3">
                <span className="text-2xs text-slate-400">Platform:</span>
                <select
                  value={hook.type}
                  onChange={(e) => handleUpdate(hook.id, { type: e.target.value as any })}
                  className="text-xs px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="slack">Slack (Incoming Webhook)</option>
                  <option value="teams">Microsoft Teams (Connector)</option>
                  <option value="custom">Custom Webhook / HTTP</option>
                </select>

                <button
                  onClick={() => handleDelete(hook.id)}
                  className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                  title="Remove Webhook"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-2xs font-semibold uppercase text-slate-500 mb-1">
                  Webhook Target URL
                </label>
                <input
                  type="text"
                  value={hook.url}
                  onChange={(e) => handleUpdate(hook.id, { url: e.target.value })}
                  placeholder="https://hooks.slack.com/services/..."
                  className="w-full text-xs font-mono px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-2xs font-semibold uppercase text-slate-500 mb-1">
                  Channel / Room Name (Optional)
                </label>
                <input
                  type="text"
                  value={hook.channel || ''}
                  onChange={(e) => handleUpdate(hook.id, { channel: e.target.value })}
                  placeholder="#qa-alerts"
                  className="w-full text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Notification Triggers */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <div className="flex flex-wrap items-center gap-5 text-xs text-slate-700">
                <span className="text-2xs font-semibold uppercase text-slate-400">Trigger On:</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hook.notifyOnPass}
                    onChange={(e) => handleUpdate(hook.id, { notifyOnPass: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Test Passes</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hook.notifyOnFail}
                    onChange={(e) => handleUpdate(hook.id, { notifyOnFail: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Test Failures</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hook.notifyOnSelfHeal}
                    onChange={(e) => handleUpdate(hook.id, { notifyOnSelfHeal: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Autonomous Self-Heal Fixes</span>
                </label>
              </div>

              <button
                onClick={() => handleTestDispatch(hook)}
                disabled={isTesting === hook.id}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                {isTesting === hook.id ? 'Sending...' : 'Test Ping'}
              </button>
            </div>

            {/* Test notification result display */}
            {testResult && testResult.webhookId === hook.id && (
              <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
                <div className="flex items-center justify-between font-semibold">
                  <span className="flex items-center gap-1.5 text-emerald-700">
                    <Check className="w-4 h-4 text-emerald-600" />
                    {testResult.message}
                  </span>
                  <span className="text-2xs font-mono text-slate-400">
                    Format: {hook.type.toUpperCase()}
                  </span>
                </div>
                {testResult.payload && (
                  <pre className="p-2 bg-slate-900 text-slate-200 font-mono text-2xs rounded overflow-x-auto max-h-36">
                    {JSON.stringify(testResult.payload, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

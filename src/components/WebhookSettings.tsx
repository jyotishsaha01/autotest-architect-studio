import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Send, 
  Plus, 
  Trash2, 
  Check, 
  AlertCircle, 
  MessageSquare,
  RefreshCw
} from 'lucide-react';
import { TestIR } from '../types/testAutomation';

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

interface WebhookSettingsProps {
  currentTestIR: TestIR;
  apiFetch: typeof fetch;
}

export const WebhookSettings: React.FC<WebhookSettingsProps> = ({ currentTestIR, apiFetch }) => {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accessError, setAccessError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ webhookId: string; success: boolean; message: string; payload?: any } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => { fetchWebhooks(); }, [apiFetch]);

  const fetchWebhooks = async () => {
    try {
      const res = await apiFetch('/api/webhooks');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load webhook settings.');
      if (data.webhooks) {
        setWebhooks(data.webhooks);
      }
      setHasUnsavedChanges(false);
      setAccessError('');
    } catch (err) {
      setAccessError(err instanceof Error ? err.message : 'Failed to load webhook settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const res = await apiFetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhooks })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save webhook configuration.');
      if (res.ok) {
        setSaveSuccess(true);
        setHasUnsavedChanges(false);
        setAccessError('');
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } catch (err) {
      setAccessError(err instanceof Error ? err.message : 'Could not save webhook configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddWebhook = () => {
    const newHook: WebhookConfig = {
      id: `webhook-${Date.now()}`,
      name: 'New notification destination',
      type: 'slack',
      url: '',
      notifyOnPass: true,
      notifyOnFail: true,
      notifyOnSelfHeal: true,
      enabled: true
    };
    setWebhooks([...webhooks, newHook]);
    setHasUnsavedChanges(true);
    setTestResult(null);
  };

  const handleDelete = (id: string) => {
    setWebhooks(webhooks.filter(w => w.id !== id));
    setHasUnsavedChanges(true);
    setTestResult(null);
  };

  const handleUpdate = (id: string, updates: Partial<WebhookConfig>) => {
    setWebhooks(webhooks.map(w => w.id === id ? { ...w, ...updates } : w));
    setHasUnsavedChanges(true);
    setTestResult(null);
  };

  const handleTestDispatch = async (webhook: WebhookConfig) => {
    setIsTesting(webhook.id);
    setTestResult(null);

    try {
      const res = await apiFetch('/api/webhooks/test-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookId: webhook.id,
          eventType: 'configuration-test',
          testCaseId: currentTestIR.testCaseId,
          feature: currentTestIR.feature,
          status: 'test',
          durationMs: 0,
          details: 'Webhook delivery test. This is not a test execution result.'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.externalStatus || data.error || 'Webhook delivery failed.');
      setTestResult({
        webhookId: webhook.id,
        success: data.success,
        message: data.externalStatus || 'Test alert payload structured and dispatched.',
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
              Notifications
            </h2>
          </div>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Optional: use this only if you want test results delivered to Slack or Teams. A webhook is a private channel URL that lets this app send messages.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAddWebhook}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add destination
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg text-xs font-medium transition-colors shadow-xs"
          >
            {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : saveSuccess ? <Check className="w-3.5 h-3.5" /> : null}
            {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save changes'}
          </button>
        </div>
      </div>

      {/* Webhook Configuration Cards */}
      <div className="space-y-6 p-6">
        {accessError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">{accessError}</p>}
        <section aria-label="How notifications work" className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-slate-900">How to set this up</h3>
          <ol className="mt-3 grid gap-3 text-sm text-slate-700 md:grid-cols-3">
            <li><span className="font-semibold text-indigo-700">1. Add a destination.</span> Create an incoming webhook in Slack or Teams, then paste its URL below.</li>
            <li><span className="font-semibold text-indigo-700">2. Choose alerts.</span> Select which test outcomes should send a message and save your changes.</li>
            <li><span className="font-semibold text-indigo-700">3. Check delivery.</span> Send a test notification and confirm it appears in the selected channel.</li>
          </ol>
          <p className="mt-3 border-t border-indigo-100 pt-3 text-xs leading-5 text-slate-600">
            This app generates tests but does not run them. Real pass/fail alerts require your CI pipeline to send test results to the app. The test notification only checks that this destination can receive a message. If you do not use chat alerts or CI reporting, you can ignore this section.
          </p>
        </section>
        {webhooks.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 py-10 text-center text-slate-500">
            <MessageSquare className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-[1.5]" />
            <p className="text-sm font-medium text-slate-700">No notification destinations yet</p>
            <p className="mt-1 text-xs text-slate-500">
              Select <span className="font-medium">Add destination</span> after you create an incoming webhook URL in Slack or Teams.
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
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                <input
                  aria-label={`Enable ${hook.name}`}
                  type="checkbox"
                  checked={hook.enabled}
                  onChange={(e) => handleUpdate(hook.id, { enabled: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                Enabled
                </label>
                <input
                  aria-label="Destination name"
                  type="text"
                  value={hook.name}
                  onChange={(e) => handleUpdate(hook.id, { name: e.target.value })}
                  className="text-xs font-semibold text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none px-1"
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-slate-600">
                Platform
                <select
                  aria-label="Notification platform"
                  value={hook.type}
                  onChange={(e) => handleUpdate(hook.id, { type: e.target.value as any })}
                  className="text-xs px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="slack">Slack (Incoming Webhook)</option>
                  <option value="teams">Microsoft Teams (Workflows / Incoming Webhook)</option>
                  <option value="custom">Custom Webhook / HTTP</option>
                </select>
                </label>

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
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                  Incoming webhook URL
                </label>
                <input
                  type="password"
                  value={hook.url}
                  onChange={(e) => handleUpdate(hook.id, { url: e.target.value })}
                  placeholder={hook.type === 'slack' ? 'https://hooks.slack.com/services/…' : 'Paste the incoming webhook URL'}
                  className="w-full text-xs font-mono px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

            </div>

            {/* Notification Triggers */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <div className="flex flex-wrap items-center gap-5 text-xs text-slate-700">
                <span className="text-xs font-semibold text-slate-600">Notify me when:</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hook.notifyOnPass}
                    onChange={(e) => handleUpdate(hook.id, { notifyOnPass: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Test passes</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hook.notifyOnFail}
                    onChange={(e) => handleUpdate(hook.id, { notifyOnFail: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Test fails</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hook.notifyOnSelfHeal}
                    onChange={(e) => handleUpdate(hook.id, { notifyOnSelfHeal: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                    <span title="Only sent when an external CI integration reports a healed result.">Test recovers after a locator repair <span className="text-slate-500">(CI only)</span></span>
                </label>
              </div>

              <button
                onClick={() => handleTestDispatch(hook)}
                disabled={isTesting === hook.id || !hook.enabled || !hook.url.trim() || hasUnsavedChanges}
                title={hasUnsavedChanges ? 'Save changes before sending a test notification.' : !hook.url.trim() ? 'Add a webhook URL first.' : !hook.enabled ? 'Enable this destination first.' : 'Send a sample message to verify this destination.'}
                className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {isTesting === hook.id ? 'Sending…' : 'Send test notification'}
              </button>
            </div>

            {/* Test notification result display */}
            {testResult && testResult.webhookId === hook.id && (
              <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
                <div className="flex items-center justify-between font-semibold">
                  <span className={`flex items-center gap-1.5 ${testResult.success ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {testResult.success ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                    {testResult.message}
                  </span>
                  <span className="text-2xs font-mono text-slate-400">
                    Format: {hook.type.toUpperCase()}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
        {hasUnsavedChanges && webhooks.length > 0 && (
          <p role="status" className="text-xs text-amber-800">You have unsaved changes. Save changes before sending a test notification.</p>
        )}
      </div>
    </div>
  );
};

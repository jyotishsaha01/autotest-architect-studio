import React, { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { 
  Bot, 
  Layers, 
  Code2, 
  GitBranch, 
  Play, 
  ShieldCheck,
  Workflow,
  BarChart3,
  Bell
} from 'lucide-react';
import { TestIR, FrameworkType } from './types/testAutomation';
import { generateAutomationSuite } from './utils/codeGenerators';
import { InputStudio } from './components/InputStudio';
import { CodeViewer } from './components/CodeViewer';
import { SprintUpdateEngine } from './components/SprintUpdateEngine';
import { TestRunner } from './components/TestRunner';
import { CiPipelineGenerator } from './components/CiPipelineGenerator';
import { WebhookSettings } from './components/WebhookSettings';

const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard').then(module => ({ default: module.AnalyticsDashboard })));

const EMPTY_TEST_IR: TestIR = {
  id: 'draft', testCaseId: '', title: '', description: '', feature: '', sprint: '', priority: 'P2', baseUrl: '', steps: []
};

export default function App() {
  const [currentTestIR, setCurrentTestIR] = useState<TestIR>(EMPTY_TEST_IR);
  const [hasGeneratedSuite, setHasGeneratedSuite] = useState(false);
  const [selectedFramework, setSelectedFramework] = useState<FrameworkType>('playwright-ts');
  const [activeView, setActiveView] = useState<'inputs' | 'code' | 'sprint' | 'execution' | 'cicd' | 'analytics' | 'webhooks'>('inputs');
  const [isLoading, setIsLoading] = useState(false);
  const [authState, setAuthState] = useState<'loading' | 'open' | 'required' | 'authorized'>('loading');
  const [apiToken, setApiToken] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    fetch('/api/health')
      .then(response => response.json())
      .then(data => setAuthState(data.authenticationRequired ? 'required' : 'open'))
      .catch(() => setAuthState('open'));
  }, []);

  const apiFetch = useCallback((input: RequestInfo | URL, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    if (apiToken) headers.set('Authorization', `Bearer ${apiToken}`);
    return fetch(input, { ...init, headers });
  }, [apiToken]);

  const handleConnect = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError('');
    try {
      const response = await fetch('/api/session', { headers: { Authorization: `Bearer ${apiToken}` } });
      if (!response.ok) throw new Error('That access token was not accepted. Check it and try again.');
      setAuthState('authorized');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Could not connect to the workspace.');
    }
  };

  // Derive generated code files from active Test IR and framework
  const generatedFiles = generateAutomationSuite(currentTestIR, selectedFramework);

  const handleIRGenerated = (newIR: TestIR, appendToExisting: boolean, explicitNavigation: boolean) => {
    const stepsToAppend = appendToExisting && !explicitNavigation && currentTestIR.steps.some(step => step.action === 'navigate')
      ? newIR.steps.filter((step, index) => {
          if (index !== 0 || step.action !== 'navigate') return true;
          const target = step.value || newIR.baseUrl;
          return target !== newIR.baseUrl && target !== `${newIR.baseUrl}/`;
        })
      : newIR.steps;
    const resultingIR = appendToExisting
      ? {
          ...currentTestIR,
          feature: newIR.feature || currentTestIR.feature,
          baseUrl: newIR.baseUrl || currentTestIR.baseUrl,
          steps: [
            ...currentTestIR.steps,
            ...stepsToAppend.map((step, index) => ({
              ...step,
              id: `append-${Date.now()}-${index}-${step.id}`,
              stepNumber: currentTestIR.steps.length + index + 1
            }))
          ]
        }
      : newIR;
    setCurrentTestIR(resultingIR);
    setHasGeneratedSuite(true);

    setActiveView('code');
  };

  const handleApplySprintPatch = (updatedIR: TestIR) => {
    setCurrentTestIR(updatedIR);
    setActiveView('code');
  };

  if (authState === 'loading') return <div className="min-h-screen grid place-items-center bg-slate-100 text-sm text-slate-600">Connecting to AutoTest Architect…</div>;
  if (authState === 'required') return (
    <main className="min-h-screen grid place-items-center bg-slate-100 px-4">
      <form onSubmit={handleConnect} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-600 text-white"><ShieldCheck className="h-5 w-5" /></div>
          <div><h1 className="text-lg font-semibold text-slate-900">AutoTest Architect</h1><p className="text-sm text-slate-500">Secure workspace access</p></div>
        </div>
        <label htmlFor="workspace-token" className="mb-1.5 block text-sm font-medium text-slate-700">Workspace access token</label>
        <input id="workspace-token" type="password" autoComplete="current-password" value={apiToken} onChange={event => setApiToken(event.target.value)} required className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
        {authError && <p role="alert" className="mt-3 text-sm text-rose-700">{authError}</p>}
        <button type="submit" className="mt-5 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700">Connect securely</button>
        <p className="mt-4 text-xs leading-5 text-slate-500">Your access token stays in page memory and is cleared when you reload or close this page.</p>
      </form>
    </main>
  );

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 tracking-tight">
                  AutoTest Architect
                </h1>
              </div>
              <p className="text-2xs text-slate-500">
                Test design · Code generation · CI pipelines
              </p>
            </div>
          </div>

          {/* Editable suite metadata */}
          <div className="flex items-center gap-2.5 text-xs">
            {hasGeneratedSuite && <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-600">
              <span className="text-slate-400">Target:</span>
              <input
                aria-label="Target name"
                title="Edit target name"
                value={currentTestIR.feature}
                onChange={(event) => setCurrentTestIR((ir) => ({ ...ir, feature: event.target.value }))}
                className="w-28 bg-transparent font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-indigo-300 rounded px-1"
              />
              <span className="text-slate-300">|</span>
              <input
                aria-label="Test case ID"
                title="Edit test case ID"
                value={currentTestIR.testCaseId}
                onChange={(event) => setCurrentTestIR((ir) => ({ ...ir, testCaseId: event.target.value }))}
                className="w-28 bg-transparent font-mono text-indigo-600 font-semibold outline-none focus:ring-1 focus:ring-indigo-300 rounded px-1"
              />
              <span className="text-slate-300">|</span>
              <input
                aria-label="Sprint"
                title="Edit sprint"
                value={currentTestIR.sprint}
                onChange={(event) => setCurrentTestIR((ir) => ({ ...ir, sprint: event.target.value }))}
                className="w-20 bg-transparent font-medium text-slate-600 outline-none focus:ring-1 focus:ring-indigo-300 rounded px-1"
              />
            </div>}
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav aria-label="Workspace sections" className="max-w-7xl mx-auto grid grid-cols-2 gap-1 border-t border-slate-100 px-4 py-2 sm:px-6 md:grid-cols-4 lg:px-8">
          <button
            aria-current={activeView === 'inputs' ? 'page' : undefined}
            onClick={() => setActiveView('inputs')}
            className={`flex min-h-10 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors ${
              activeView === 'inputs'
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            Create tests
          </button>

          <button
            aria-current={activeView === 'code' ? 'page' : undefined}
            onClick={() => setActiveView('code')}
            disabled={!hasGeneratedSuite}
            title={!hasGeneratedSuite ? 'Create a test suite first to view generated code.' : 'View and export generated test code.'}
            className={`flex min-h-10 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors ${
              !hasGeneratedSuite
                ? 'cursor-not-allowed text-slate-300'
                : activeView === 'code'
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Code2 className="w-4 h-4" />
            Generated code
          </button>

          <button
            aria-current={activeView === 'sprint' ? 'page' : undefined}
            onClick={() => setActiveView('sprint')}
            disabled={!hasGeneratedSuite}
            title={!hasGeneratedSuite ? 'Create a test suite first to review sprint changes.' : 'Compare new sprint changes with the current test suite.'}
            className={`flex min-h-10 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors ${
              !hasGeneratedSuite
                ? 'cursor-not-allowed text-slate-300'
                : activeView === 'sprint'
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <GitBranch className="w-4 h-4" />
            Sprint updates
          </button>

          <button
            aria-current={activeView === 'execution' ? 'page' : undefined}
            onClick={() => setActiveView('execution')}
            disabled={!hasGeneratedSuite}
            title={!hasGeneratedSuite ? 'Create a test suite first to get run instructions.' : 'View commands for installing dependencies and running the suite.'}
            className={`flex min-h-10 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors ${
              !hasGeneratedSuite
                ? 'cursor-not-allowed text-slate-300'
                : activeView === 'execution'
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Play className="w-4 h-4" />
            Run instructions
          </button>

          <button
            aria-current={activeView === 'cicd' ? 'page' : undefined}
            onClick={() => setActiveView('cicd')}
            disabled={!hasGeneratedSuite}
            title={!hasGeneratedSuite ? 'Create a test suite first to generate its CI pipeline.' : 'Generate CI configuration for your test suite.'}
            className={`flex min-h-10 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors ${
              !hasGeneratedSuite
                ? 'cursor-not-allowed text-slate-300'
                : activeView === 'cicd'
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Workflow className="w-4 h-4" />
            CI/CD pipelines
          </button>

          <button
            aria-current={activeView === 'analytics' ? 'page' : undefined}
            onClick={() => setActiveView('analytics')}
            disabled={!hasGeneratedSuite}
            title={!hasGeneratedSuite ? 'Create a test suite first to view its summary.' : 'View metrics for the active test suite.'}
            className={`flex min-h-10 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors ${
              !hasGeneratedSuite
                ? 'cursor-not-allowed text-slate-300'
                : activeView === 'analytics'
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Test summary
          </button>

          <button
            aria-current={activeView === 'webhooks' ? 'page' : undefined}
            onClick={() => setActiveView('webhooks')}
            className={`flex min-h-10 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors ${
              activeView === 'webhooks'
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Bell className="w-4 h-4" />
            Notifications
          </button>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        {/* Canonical Test IR Summary bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                {currentTestIR.testCaseId || 'Draft'}
              </span>
              <h2 className="text-sm font-semibold text-slate-900">
                {hasGeneratedSuite ? currentTestIR.title : 'No test suite generated yet'}
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              {hasGeneratedSuite ? currentTestIR.description : 'Add your application URL and test steps to create your first automation suite.'}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Steps:</span>
              <span className="font-semibold text-slate-800">{currentTestIR.steps.length} steps</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Base URL:</span>
              <span className="font-mono text-indigo-600">{currentTestIR.baseUrl || 'Add target URL'}</span>
            </div>
          </div>
        </div>

        {/* View Router */}
        <div hidden={activeView !== 'inputs'}>
          <InputStudio
            onIRGenerated={handleIRGenerated}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            currentTestIR={currentTestIR}
            canAppendToExisting={hasGeneratedSuite}
            apiFetch={apiFetch}
          />
        </div>

        {activeView === 'code' && (
          <CodeViewer
            files={generatedFiles}
            selectedFramework={selectedFramework}
            onFrameworkChange={setSelectedFramework}
            currentTestIR={currentTestIR}
          />
        )}

        {activeView === 'sprint' && (
          <SprintUpdateEngine
            currentTestIR={currentTestIR}
            onApplySprintPatch={handleApplySprintPatch}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            apiFetch={apiFetch}
          />
        )}

        {activeView === 'execution' && (
          <TestRunner
            currentTestIR={currentTestIR}
            selectedFramework={selectedFramework}
          />
        )}

        {activeView === 'cicd' && (
          <CiPipelineGenerator
            currentTestIR={currentTestIR}
            selectedFramework={selectedFramework}
          />
        )}

        {activeView === 'analytics' && (
          <Suspense fallback={<div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading analytics…</div>}>
            <AnalyticsDashboard currentTestIR={currentTestIR} />
          </Suspense>
        )}

        {activeView === 'webhooks' && (
          <WebhookSettings
            currentTestIR={currentTestIR}
            apiFetch={apiFetch}
          />
        )}
      </main>

    </div>
  );
}

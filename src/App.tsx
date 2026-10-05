import React, { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { 
  Bot, 
  Layers, 
  Code2, 
  GitBranch, 
  Play, 
  Network, 
  Sparkles,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Workflow,
  BarChart3,
  Github,
  CheckCircle
} from 'lucide-react';
import { TestIR, FrameworkType, UIElementModel } from './types/testAutomation';
import { generateAutomationSuite } from './utils/codeGenerators';
import { InputStudio } from './components/InputStudio';
import { CodeViewer } from './components/CodeViewer';
import { SprintUpdateEngine } from './components/SprintUpdateEngine';
import { TestRunner } from './components/TestRunner';
import { KnowledgeGraphViewer } from './components/KnowledgeGraphViewer';
import { CiPipelineGenerator } from './components/CiPipelineGenerator';
import { WebhookSettings } from './components/WebhookSettings';
import { GitHubPushModal } from './components/GitHubPushModal';

const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard').then(module => ({ default: module.AnalyticsDashboard })));

const EMPTY_TEST_IR: TestIR = {
  id: 'draft', testCaseId: '', title: '', description: '', feature: '', sprint: '', priority: 'P2', baseUrl: '', steps: []
};

export default function App() {
  const [currentTestIR, setCurrentTestIR] = useState<TestIR>(EMPTY_TEST_IR);
  const [hasGeneratedSuite, setHasGeneratedSuite] = useState(false);
  const [selectedFramework, setSelectedFramework] = useState<FrameworkType>('playwright-ts');
  const [activeView, setActiveView] = useState<'inputs' | 'code' | 'sprint' | 'execution' | 'graph' | 'cicd' | 'analytics' | 'webhooks'>('inputs');
  const [uiElements, setUiElements] = useState<UIElementModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);
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

    // Extract UI Elements into Knowledge Graph
    const newElements: UIElementModel[] = resultingIR.steps
      .filter(s => s.target?.semantic && s.target.recommendedLocator)
      .map(s => ({
        semanticId: `${newIR.feature.toLowerCase().replace(/\s+/g, '.')}.${s.target!.semantic.toLowerCase().replace(/\s+/g, '_')}`,
        businessName: s.target!.semantic,
        page: resultingIR.baseUrl ? new URL(resultingIR.baseUrl).pathname || '/' : '/',
        role: s.target!.role || 'element',
        primaryLocator: s.target!.recommendedLocator!,
        fallbackLocators: s.target!.locators?.map(l => l.selector) || [s.target!.recommendedLocator!],
        lastUpdatedSprint: resultingIR.sprint || 'Sprint 1'
      }));

    if (newElements.length > 0) {
      setUiElements(prev => {
        const map = new Map<string, UIElementModel>();
        prev.forEach(e => map.set(e.semanticId, e));
        newElements.forEach(e => map.set(e.semanticId, e));
        return Array.from(map.values());
      });
    }

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

          {/* Quick Stats / Active Project pill & Actions */}
          <div className="flex items-center gap-2.5 text-xs">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-600">
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
            </div>

            {/* Push to GitHub Modal trigger */}
            <button
              onClick={() => setIsGitHubModalOpen(true)}
              title="View instructions for connecting this project to GitHub"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors shadow-xs text-xs"
            >
              <Github className="w-3.5 h-3.5" />
              GitHub setup
            </button>

            <button
              onClick={() => setActiveView('inputs')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-xs text-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              New Ingestion
            </button>
          </div>
        </div>

        {/* GitHub Push Guide Modal */}
        <GitHubPushModal
          isOpen={isGitHubModalOpen}
          onClose={() => setIsGitHubModalOpen(false)}
        />

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 border-t border-slate-100 overflow-x-auto">
          <button
            onClick={() => setActiveView('inputs')}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeView === 'inputs'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            1. Multi-Modal Ingestion
          </button>

          <button
            onClick={() => setActiveView('code')}
            disabled={!hasGeneratedSuite}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              !hasGeneratedSuite
                ? 'cursor-not-allowed border-transparent text-slate-300'
                : activeView === 'code'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code2 className="w-4 h-4" />
            2. Code Repository ({selectedFramework.split('-')[0].toUpperCase()})
          </button>

          <button
            onClick={() => setActiveView('sprint')}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeView === 'sprint'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <GitBranch className="w-4 h-4" />
            3. Sprint Incremental Diff
          </button>

          <button
            onClick={() => setActiveView('execution')}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeView === 'execution'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Play className="w-4 h-4" />
            4. Execution Setup
          </button>

          <button
            onClick={() => setActiveView('graph')}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeView === 'graph'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Network className="w-4 h-4" />
            5. UI Semantic Graph ({uiElements.length})
          </button>

          <button
            onClick={() => setActiveView('cicd')}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeView === 'cicd'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Workflow className="w-4 h-4" />
            6. CI/CD Pipelines
          </button>

          <button
            onClick={() => setActiveView('analytics')}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeView === 'analytics'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            7. Test Analytics
          </button>

          <button
            onClick={() => setActiveView('webhooks')}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeView === 'webhooks'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bot className="w-4 h-4" />
            8. Webhooks &amp; Alerts
          </button>
        </div>
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

        {activeView === 'graph' && (
          <KnowledgeGraphViewer
            elements={uiElements}
            currentTestIR={currentTestIR}
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

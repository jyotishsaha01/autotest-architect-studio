import React, { useState, useEffect } from 'react';
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
  Activity,
  CheckCircle,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { TestIR, FrameworkType, UIElementModel } from './types/testAutomation';
import { SAMPLE_TEST_IR, SAMPLE_UI_GRAPH } from './data/sampleData';
import { generateAutomationSuite } from './utils/codeGenerators';
import { InputStudio } from './components/InputStudio';
import { CodeViewer } from './components/CodeViewer';
import { SprintUpdateEngine } from './components/SprintUpdateEngine';
import { TestRunner } from './components/TestRunner';
import { KnowledgeGraphViewer } from './components/KnowledgeGraphViewer';
import { CiPipelineGenerator } from './components/CiPipelineGenerator';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { WebhookSettings } from './components/WebhookSettings';
import { GitHubPushModal } from './components/GitHubPushModal';

export default function App() {
  const [currentTestIR, setCurrentTestIR] = useState<TestIR>(SAMPLE_TEST_IR);
  const [selectedFramework, setSelectedFramework] = useState<FrameworkType>('playwright-ts');
  const [activeView, setActiveView] = useState<'inputs' | 'code' | 'sprint' | 'execution' | 'graph' | 'cicd' | 'analytics' | 'webhooks'>('inputs');
  const [uiElements, setUiElements] = useState<UIElementModel[]>(SAMPLE_UI_GRAPH);
  const [isLoading, setIsLoading] = useState(false);
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);

  // Real-time suite health status polling effect
  const [suiteHealth, setSuiteHealth] = useState({
    passing: 4,
    total: 5,
    flaky: 0,
    lastPolled: 'Just now',
    isSyncing: false
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setSuiteHealth((prev) => {
        // Mock occasional health fluctuation in the CI pipeline
        const passes = Math.random() > 0.35 ? 4 : 5;
        const flakyCount = passes === 4 ? 1 : 0;
        return {
          passing: passes,
          total: 5,
          flaky: flakyCount,
          lastPolled: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          isSyncing: true
        };
      });

      setTimeout(() => {
        setSuiteHealth((prev) => ({ ...prev, isSyncing: false }));
      }, 700);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  // Derive generated code files from active Test IR and framework
  const generatedFiles = generateAutomationSuite(currentTestIR, selectedFramework);

  const handleIRGenerated = (newIR: TestIR) => {
    setCurrentTestIR(newIR);

    // Extract UI Elements into Knowledge Graph
    const newElements: UIElementModel[] = newIR.steps
      .filter(s => s.target?.semantic && s.target.recommendedLocator)
      .map(s => ({
        semanticId: `${newIR.feature.toLowerCase().replace(/\s+/g, '.')}.${s.target!.semantic.toLowerCase().replace(/\s+/g, '_')}`,
        businessName: s.target!.semantic,
        page: newIR.baseUrl ? new URL(newIR.baseUrl).pathname || '/' : '/',
        role: s.target!.role || 'element',
        primaryLocator: s.target!.recommendedLocator!,
        fallbackLocators: s.target!.locators?.map(l => l.selector) || [s.target!.recommendedLocator!],
        lastUpdatedSprint: newIR.sprint || 'Sprint 1'
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

  const handleAutoHealApplied = (healedIR: TestIR) => {
    setCurrentTestIR(healedIR);
  };

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
                <span className="text-2xs font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md">
                  AI Test-to-Automation
                </span>
              </div>
              <p className="text-2xs text-slate-500">
                Multi-Modal Ingestion · Canonical Test IR · CI/CD Pipelines · Self-Healing · ROI Analytics
              </p>
            </div>
          </div>

          {/* Quick Stats / Active Project pill & Actions */}
          <div className="flex items-center gap-2.5 text-xs">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-600">
              <span className="text-slate-400">Target:</span>
              <span className="font-semibold text-slate-800">{currentTestIR.feature}</span>
              <span className="text-slate-300">|</span>
              <span className="font-mono text-indigo-600 font-semibold">{currentTestIR.testCaseId}</span>
              <span className="text-slate-300">|</span>
              <span className="font-medium text-slate-600">{currentTestIR.sprint}</span>
            </div>

            {/* Push to GitHub Modal trigger */}
            <button
              onClick={() => setIsGitHubModalOpen(true)}
              title="Push this application to your GitHub repository"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors shadow-xs text-xs"
            >
              <Github className="w-3.5 h-3.5" />
              Push to GitHub
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
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeView === 'code'
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
            4. Execution &amp; Self-Healing
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
            7. Analytics &amp; ROI
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
                {currentTestIR.testCaseId}
              </span>
              <h2 className="text-sm font-semibold text-slate-900">
                {currentTestIR.title}
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              {currentTestIR.description}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Steps:</span>
              <span className="font-semibold text-slate-800">{currentTestIR.steps.length} automated steps</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Base URL:</span>
              <span className="font-mono text-indigo-600">{currentTestIR.baseUrl}</span>
            </div>
          </div>
        </div>

        {/* View Router */}
        {activeView === 'inputs' && (
          <InputStudio
            onIRGenerated={handleIRGenerated}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        )}

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
          />
        )}

        {activeView === 'execution' && (
          <TestRunner
            currentTestIR={currentTestIR}
            onAutoHealApplied={handleAutoHealApplied}
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
          <AnalyticsDashboard
            currentTestIR={currentTestIR}
          />
        )}

        {activeView === 'webhooks' && (
          <WebhookSettings
            currentTestIR={currentTestIR}
          />
        )}
      </main>

      {/* Global Real-Time Suite Health Status Bar */}
      <footer className="sticky bottom-0 z-30 bg-slate-900 border-t border-slate-800 text-slate-300 px-4 sm:px-6 py-2.5 shadow-lg backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Left: Suite Health Metric */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  suiteHealth.passing === suiteHealth.total ? 'bg-emerald-400' : 'bg-amber-400'
                }`} />
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  suiteHealth.passing === suiteHealth.total ? 'bg-emerald-500' : 'bg-amber-500'
                }`} />
              </span>
              <span className="font-semibold text-slate-100 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                Suite Health:
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className={`font-mono font-bold text-xs ${
                suiteHealth.passing === suiteHealth.total ? 'text-emerald-400' : 'text-amber-300'
              }`}>
                {suiteHealth.passing}/{suiteHealth.total} tests passing
              </span>

              <span className="text-slate-600">|</span>

              <span className="text-2xs text-slate-400">
                Success Rate: <strong className="text-slate-200">{Math.round((suiteHealth.passing / suiteHealth.total) * 100)}%</strong>
              </span>

              {suiteHealth.flaky > 0 && (
                <>
                  <span className="text-slate-600">|</span>
                  <span className="text-2xs text-amber-300 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    {suiteHealth.flaky} flaky step detected
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Right: Live Polling Activity & Target Info */}
          <div className="flex items-center gap-4 text-2xs text-slate-400">
            <div className="hidden sm:flex items-center gap-1.5">
              <span>Sprint:</span>
              <span className="font-semibold text-slate-300">{currentTestIR.sprint}</span>
              <span className="text-slate-600">·</span>
              <span>Spec:</span>
              <span className="font-mono text-indigo-300 font-semibold">{currentTestIR.testCaseId}</span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-400">
              <RefreshCw className={`w-3 h-3 text-slate-500 ${suiteHealth.isSyncing ? 'animate-spin text-indigo-400' : ''}`} />
              <span>Polled: <span className="font-mono text-slate-300">{suiteHealth.lastPolled}</span></span>
            </div>

            <button
              onClick={() => setActiveView('execution')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 rounded text-2xs font-medium transition-colors border border-slate-700/60"
            >
              View Execution &rarr;
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

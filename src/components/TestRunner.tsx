import React, { useState } from 'react';
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  Wand2, 
  RotateCcw, 
  ShieldCheck, 
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Terminal,
  Activity
} from 'lucide-react';
import { TestIR, ExecutionReport, ExecutionStepResult } from '../types/testAutomation';

interface TestRunnerProps {
  currentTestIR: TestIR;
  onAutoHealApplied: (updatedIR: TestIR) => void;
}

export const TestRunner: React.FC<TestRunnerProps> = ({ currentTestIR, onAutoHealApplied }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<ExecutionReport | null>(null);
  const [activeStepLog, setActiveStepLog] = useState<number | null>(null);
  const [simulateFailure, setSimulateFailure] = useState(true);
  const [isHealing, setIsHealing] = useState(false);
  const [healedResult, setHealedResult] = useState<any | null>(null);

  const handleRunExecution = () => {
    setIsRunning(true);
    setReport(null);
    setHealedResult(null);

    // Simulate real Playwright headless run step-by-step
    const steps: ExecutionStepResult[] = [];
    let currentIdx = 0;

    const interval = setInterval(() => {
      if (currentIdx < currentTestIR.steps.length) {
        const step = currentTestIR.steps[currentIdx];
        
        // If simulation of locator drift is enabled, fail at step 4 (the submit button)
        const isFailingStep = simulateFailure && step.stepNumber === 4;

        steps.push({
          stepNumber: step.stepNumber,
          action: step.action,
          target: step.target?.semantic || step.description,
          status: isFailingStep ? 'failed' : 'passed',
          durationMs: Math.floor(Math.random() * 250) + 120,
          error: isFailingStep 
            ? `TimeoutError: locator.click: Timeout 5000ms exceeded.\nCall log:\n  - waiting for locator('${step.target?.recommendedLocator || '#login'}')\n  - locator resolved to 0 elements.`
            : undefined
        });

        currentIdx++;
        setReport({
          id: `exec-${Date.now()}`,
          testCaseId: currentTestIR.testCaseId,
          timestamp: new Date().toLocaleTimeString(),
          durationMs: steps.reduce((acc, s) => acc + s.durationMs, 0),
          status: isFailingStep ? 'failed' : 'passed',
          passedSteps: steps.filter(s => s.status === 'passed').length,
          failedSteps: steps.filter(s => s.status === 'failed').length,
          totalSteps: currentTestIR.steps.length,
          steps: [...steps],
          failureAnalysis: isFailingStep ? {
            category: 'LOCATOR_CHANGED',
            summary: `Selector '${step.target?.recommendedLocator}' no longer matches target in current DOM.`,
            oldLocator: step.target?.recommendedLocator,
            suggestedFix: "button[data-testid='sso-continue-button']"
          } : undefined
        });

        if (isFailingStep) {
          clearInterval(interval);
          setIsRunning(false);
        }
      } else {
        clearInterval(interval);
        setIsRunning(false);
      }
    }, 450);
  };

  const handleSelfHeal = async () => {
    if (!report?.failureAnalysis) return;
    setIsHealing(true);

    try {
      const failedStep = currentTestIR.steps.find(s => s.stepNumber === 4) || currentTestIR.steps[0];
      const response = await fetch('/api/self-heal-locator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          failedStep,
          failedLocator: report.failureAnalysis.oldLocator,
          testIntent: failedStep.description,
          currentDomOrSnippet: `<form class="auth-v2"><input name="username" /><button type="submit" data-testid="sso-continue-button" class="btn-sso">Continue with SSO</button></form>`
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to heal locator');
      }

      setHealedResult(data);

      // Create updated Test IR with the healed locator
      const updatedSteps = currentTestIR.steps.map(s => {
        if (s.stepNumber === failedStep.stepNumber && s.target) {
          return {
            ...s,
            target: {
              ...s.target,
              recommendedLocator: data.newLocator,
              locators: data.locatorCandidates || s.target.locators
            }
          };
        }
        return s;
      });

      const updatedIR: TestIR = {
        ...currentTestIR,
        steps: updatedSteps
      };

      onAutoHealApplied(updatedIR);
    } catch (err) {
      console.error(err);
    } finally {
      setIsHealing(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      {/* Top action bar */}
      <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/60">
        <div>
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            Isolated Execution & Self-Healing Engine
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Execute headless browser test automation against current DOM snapshots and trigger autonomous healing when locators drift.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={simulateFailure}
              onChange={(e) => setSimulateFailure(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            Simulate locator drift (Sprint failure)
          </label>

          <button
            onClick={handleRunExecution}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg text-xs font-medium transition-colors shadow-xs"
          >
            {isRunning ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" />
                Executing Browser Steps...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                Run Suite ({currentTestIR.testCaseId})
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Execution View */}
      <div className="p-6">
        {!report && !isRunning && (
          <div className="py-16 text-center text-slate-400">
            <Terminal className="w-12 h-12 mx-auto stroke-[1.5] text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-700">No active test run execution</p>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Launch the test execution runner to validate element locators against the target DOM and trace execution latency.
            </p>
          </div>
        )}

        {report && (
          <div className="space-y-6">
            {/* Run summary strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <div className="text-2xs text-slate-500 uppercase font-semibold">Status</div>
                <div className="flex items-center gap-1.5 mt-1">
                  {report.status === 'passed' && (
                    <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      PASSED (100%)
                    </span>
                  )}
                  {report.status === 'failed' && (
                    <span className="text-xs font-semibold text-rose-700 flex items-center gap-1">
                      <XCircle className="w-4 h-4 text-rose-600" />
                      FAILED (Step {report.steps.length})
                    </span>
                  )}
                </div>
              </div>

              <div>
                <div className="text-2xs text-slate-500 uppercase font-semibold">Duration</div>
                <div className="text-xs font-mono font-medium text-slate-800 mt-1">{report.durationMs}ms</div>
              </div>

              <div>
                <div className="text-2xs text-slate-500 uppercase font-semibold">Steps Completed</div>
                <div className="text-xs font-mono font-medium text-slate-800 mt-1">
                  {report.passedSteps} / {report.totalSteps}
                </div>
              </div>

              <div>
                <div className="text-2xs text-slate-500 uppercase font-semibold">Runner Environment</div>
                <div className="text-xs font-medium text-slate-800 mt-1">Chromium 124.0 (Headless)</div>
              </div>
            </div>

            {/* Failure diagnosis & Self Healing Callout */}
            {report.failureAnalysis && (
              <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      <span className="text-xs font-bold text-rose-900">
                        Autonomous Diagnostic: {report.failureAnalysis.category}
                      </span>
                    </div>
                    <p className="text-xs text-rose-700">{report.failureAnalysis.summary}</p>
                    <p className="text-2xs text-slate-500">
                      The application UI has evolved in this sprint. The AI can inspect the current live DOM, rank new candidate locators, and heal the automation code.
                    </p>
                  </div>

                  <button
                    onClick={handleSelfHeal}
                    disabled={isHealing || !!healedResult}
                    className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-medium transition-colors shadow-xs"
                  >
                    <Wand2 className={`w-3.5 h-3.5 ${isHealing ? 'animate-spin' : ''}`} />
                    {isHealing ? 'Diagnosing DOM...' : healedResult ? 'Repaired' : 'Autonomous Self-Heal'}
                  </button>
                </div>

                {healedResult && (
                  <div className="mt-4 p-3 bg-white border border-emerald-200 rounded-lg text-xs space-y-2">
                    <div className="flex items-center justify-between text-emerald-700 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Locator Repaired (Confidence: {(healedResult.confidence * 100).toFixed(0)}%)
                      </span>
                      <span className="text-2xs font-mono bg-emerald-50 px-2 py-0.5 rounded text-emerald-800">
                        AUTO-HEALED
                      </span>
                    </div>
                    <div className="text-slate-600 text-2xs">{healedResult.reason}</div>
                    <div className="font-mono text-2xs bg-slate-900 text-slate-100 p-2 rounded">
                      <div className="text-rose-400">- {healedResult.oldLocator}</div>
                      <div className="text-emerald-400">+ {healedResult.newLocator}</div>
                    </div>
                    <div className="text-2xs text-slate-500">
                      Updated in Test IR & Page Object code. Re-run execution to verify the healed test passing.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step-by-step logs */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700">
                Step-by-Step Execution Trace
              </div>
              <div className="divide-y divide-slate-100">
                {report.steps.map((st) => (
                  <div key={st.stepNumber} className="p-3 text-xs flex items-start justify-between gap-4 hover:bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {st.status === 'passed' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-600" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">
                          Step {st.stepNumber}: <span className="font-mono text-indigo-600">{st.action}</span> - {st.target}
                        </div>
                        {st.error && (
                          <pre className="mt-2 text-2xs font-mono bg-rose-50 text-rose-700 p-2 rounded border border-rose-200 whitespace-pre-wrap">
                            {st.error}
                          </pre>
                        )}
                      </div>
                    </div>

                    <div className="text-2xs font-mono text-slate-400 shrink-0">
                      {st.durationMs}ms
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

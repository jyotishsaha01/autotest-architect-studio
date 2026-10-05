import React, { useState } from 'react';
import { 
  GitBranch, 
  ArrowRight, 
  Sparkles, 
  Layers, 
  Check, 
  X, 
  Plus, 
  ShieldCheck,
  FileDiff,
  AlertTriangle
} from 'lucide-react';
import { TestIR, SprintChangeDiff } from '../types/testAutomation';

interface SprintUpdateEngineProps {
  currentTestIR: TestIR;
  onApplySprintPatch: (updatedIR: TestIR) => void;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
  apiFetch: typeof fetch;
}

export const SprintUpdateEngine: React.FC<SprintUpdateEngineProps> = ({
  currentTestIR,
  onApplySprintPatch,
  isLoading,
  setIsLoading,
  apiFetch
}) => {
  const [sprintNumber, setSprintNumber] = useState('');
  const [sprintNotes, setSprintNotes] = useState('');
  const [newDomSnippet, setNewDomSnippet] = useState('');

  const [detectedDiffs, setDetectedDiffs] = useState<SprintChangeDiff[] | null>(null);
  const [diffSummary, setDiffSummary] = useState<string>('');
  const [candidateUpdatedIR, setCandidateUpdatedIR] = useState<TestIR | null>(null);
  const [applied, setApplied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDetectChanges = async () => {
    if (!currentTestIR.steps.length) {
      setErrorMessage('Generate a test suite before comparing sprint changes.');
      return;
    }
    if (!sprintNumber.trim() || (!sprintNotes.trim() && !newDomSnippet.trim())) {
      setErrorMessage('Enter a target sprint and at least one change note or updated DOM snippet.');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    setApplied(false);

    try {
      const response = await apiFetch('/api/detect-sprint-diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentTestIR,
          newSprintNumber: sprintNumber,
          newSprintInputs: {
            textNotes: sprintNotes,
            domSnippet: newDomSnippet
          }
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to detect sprint diff');
      }

      setDetectedDiffs(data.changes || []);
      setDiffSummary(data.summary || '');
      setCandidateUpdatedIR(data.updatedTestIR || null);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error running sprint change detection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptPatch = () => {
    if (candidateUpdatedIR) {
      onApplySprintPatch(candidateUpdatedIR);
      setApplied(true);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-semibold text-slate-900">
              Update a test suite for a new sprint
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Describe what changed in the new sprint. Review the proposed test changes before applying them to this suite.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Target Sprint:</span>
          <input
            type="text"
            value={sprintNumber}
            onChange={(e) => setSprintNumber(e.target.value)}
            className="text-xs px-2.5 py-1 bg-white border border-slate-200 rounded-md font-semibold text-indigo-600 w-28 text-center"
          />
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input for new sprint changes */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-800">
                New Sprint Feature Changes / Release Notes
              </label>
              <span className="text-2xs text-slate-400">Delta descriptions</span>
            </div>
            <textarea
              rows={6}
              value={sprintNotes}
              onChange={(e) => setSprintNotes(e.target.value)}
              className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-800">
                Updated Sprint DOM or Component Template
              </label>
              <span className="text-2xs text-slate-400">Inspected markup</span>
            </div>
            <textarea
              rows={6}
              value={newDomSnippet}
              onChange={(e) => setNewDomSnippet(e.target.value)}
              className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
            />
          </div>

          <button
            onClick={handleDetectChanges}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg text-xs font-medium transition-colors shadow-xs"
          >
            {isLoading ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                Analyzing Sprint Impact & Diffing UI Models...
              </>
            ) : (
              <>
                <FileDiff className="w-4 h-4" />
                Run Sprint Change Detection & Impact Analysis
              </>
            )}
          </button>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Right: Detected Diffs and Selective Patch Review */}
        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/40 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
              <div className="text-xs font-semibold text-slate-800 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                Impact Analysis & Proposed Patches
              </div>
              {detectedDiffs && (
                <span className="text-2xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                  {detectedDiffs.length} Change{detectedDiffs.length !== 1 ? 's' : ''} Identified
                </span>
              )}
            </div>

            {diffSummary && (
              <p className="text-xs text-slate-600 mb-4 p-2.5 bg-white border border-slate-200 rounded-lg">
                {diffSummary}
              </p>
            )}

            {!detectedDiffs && (
              <div className="py-16 text-center text-slate-400">
                <FileDiff className="w-10 h-10 mx-auto stroke-[1.5] text-slate-300 mb-2" />
                <p className="text-xs">No active sprint diff yet.</p>
                <p className="text-2xs text-slate-400 mt-0.5">
                  Click 'Run Sprint Change Detection' to compare with current test suite.
                </p>
              </div>
            )}

            {detectedDiffs && detectedDiffs.length === 0 && (
              <div className="py-12 text-center text-slate-500">
                <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-800">No Breaking Locator Changes Found</p>
                <p className="text-2xs text-slate-400 mt-1">Existing suite continues to target valid elements.</p>
              </div>
            )}

            {detectedDiffs && detectedDiffs.length > 0 && (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {detectedDiffs.map((diff, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 rounded-lg p-3 text-xs shadow-2xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="font-semibold text-slate-900">{diff.elementName}</div>
                      <span className={`text-2xs font-mono font-medium px-2 py-0.5 rounded ${
                        diff.changeType === 'RENAMED' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        diff.changeType === 'MODIFIED' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {diff.changeType}
                      </span>
                    </div>

                    <div className="text-slate-600 text-2xs mb-2">
                      {diff.explanation}
                    </div>

                    <div className="space-y-1 font-mono text-2xs bg-slate-900 text-slate-100 p-2.5 rounded-md">
                      <div className="text-rose-400">- {diff.oldValue}</div>
                      <div className="text-emerald-400">+ {diff.newValue}</div>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-2xs text-slate-400">
                      <span>Semantic ID: <span className="font-mono text-slate-600">{diff.elementSemanticId}</span></span>
                      <span>Confidence: <strong className="text-emerald-600">{(diff.confidence * 100).toFixed(0)}%</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {detectedDiffs && detectedDiffs.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {applied ? (
                  <span className="text-emerald-600 font-medium flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Patch applied to active Test IR & code generator!
                  </span>
                ) : (
                  'Review diff and apply patch to automation repository'
                )}
              </span>

              <button
                onClick={handleAcceptPatch}
                disabled={applied || !candidateUpdatedIR}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-xs font-medium transition-colors"
              >
                <Check className="w-4 h-4" />
                {applied ? 'Patched' : 'Accept & Apply Patch'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

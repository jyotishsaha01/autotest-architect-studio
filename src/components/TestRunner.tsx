import React, { useState } from 'react';
import { Check, Copy, Play } from 'lucide-react';
import { FrameworkType, TestIR } from '../types/testAutomation';

interface TestRunnerProps {
  currentTestIR: TestIR;
  selectedFramework: FrameworkType;
}

export const TestRunner: React.FC<TestRunnerProps> = ({ currentTestIR, selectedFramework }) => {
  const [copied, setCopied] = useState(false);
  const isPlaywright = selectedFramework.startsWith('playwright-');
  const setupCommands = selectedFramework === 'playwright-python'
    ? 'pip install -r requirements.txt\nplaywright install chromium'
    : selectedFramework === 'selenium-python'
      ? 'pip install -r requirements.txt'
      : selectedFramework === 'selenium-java'
        ? ''
        : 'npm install\nnpx playwright install chromium';
  const shellQuote = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`;
  const baseUrlCommand = selectedFramework === 'playwright-ts' || selectedFramework === 'playwright-js'
    ? `BASE_URL=${shellQuote(currentTestIR.baseUrl)} npx playwright test`
    : selectedFramework === 'playwright-python'
      ? `BASE_URL=${shellQuote(currentTestIR.baseUrl)} pytest tests/`
      : selectedFramework === 'selenium-java'
        ? `APP_URL=${shellQuote(currentTestIR.baseUrl)} mvn test`
        : `APP_URL=${shellQuote(currentTestIR.baseUrl)} pytest tests/`;
  const commandBlock = [setupCommands, baseUrlCommand].filter(Boolean).join('\n');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(commandBlock);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
      <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <Play aria-hidden="true" className="h-4 w-4 text-indigo-600" />
          Execution setup
        </h2>
        <p className="mt-1 text-sm text-slate-600">Run the generated suite in your project or CI environment.</p>
      </div>

      <div className="space-y-5 p-6">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          This workspace generates test code and pipeline configuration. It does not launch a browser against your target or report test results.
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900">Suite details</h3>
          <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
            <div><dt className="text-xs text-slate-500">Test case</dt><dd className="mt-1 font-medium text-slate-800">{currentTestIR.testCaseId}</dd></div>
            <div><dt className="text-xs text-slate-500">Steps</dt><dd className="mt-1 font-medium text-slate-800">{currentTestIR.steps.length}</dd></div>
            <div><dt className="text-xs text-slate-500">Framework</dt><dd className="mt-1 font-medium text-slate-800">{selectedFramework.replace('-', ' ')}</dd></div>
          </dl>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900">{isPlaywright ? 'Run with Playwright' : 'Setup & run'}</h3>
            <button onClick={handleCopy} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy command'}
            </button>
          </div>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs leading-6 text-slate-100"><code>{commandBlock}</code></pre>
          <p className="mt-2 text-xs text-slate-500">The copied command sets the active target URL for this run. Replace it with the appropriate environment URL when needed.</p>
        </div>

      </div>
    </section>
  );
};

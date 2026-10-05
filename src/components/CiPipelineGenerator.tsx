import React, { useState } from 'react';
import { 
  GitPullRequest, 
  Terminal, 
  Copy, 
  Check, 
  Download, 
  ShieldCheck, 
  Settings2,
  Workflow
} from 'lucide-react';
import { FrameworkType, TestIR } from '../types/testAutomation';
import { CiToolType, generateCiPipeline } from '../utils/ciGenerators';
import { validateSuiteForExport, ValidationFinding } from '../utils/suiteValidation';
import { ValidationDialog } from './ValidationDialog';
import { GeneratedCodeFile } from '../types/testAutomation';

interface CiPipelineGeneratorProps {
  currentTestIR: TestIR;
  selectedFramework: FrameworkType;
  files: GeneratedCodeFile[];
  onAuditEvent: (title: string, details: string) => void;
}

export const CiPipelineGenerator: React.FC<CiPipelineGeneratorProps> = ({
  currentTestIR,
  selectedFramework,
  files,
  onAuditEvent
}) => {
  const [selectedTool, setSelectedTool] = useState<CiToolType>('github-actions');
  const [copied, setCopied] = useState(false);
  const [validationFindings, setValidationFindings] = useState<ValidationFinding[]>([]);
  const [showValidation, setShowValidation] = useState(false);
  const [pendingAction, setPendingAction] = useState<'download' | 'copy'>('download');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  const pipeline = generateCiPipeline(selectedTool, selectedFramework, currentTestIR);

  const handleDownload = () => {
    const blob = new Blob([pipeline.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = pipeline.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    onAuditEvent('CI configuration exported', `${pipeline.filepath} · ${selectedFramework}.`);
  };

  const openValidation = (action: 'download' | 'copy') => {
    setExportError('');
    setPendingAction(action);
    setValidationFindings(validateSuiteForExport(currentTestIR, selectedFramework, files, pipeline));
    setShowValidation(true);
  };

  const continueAction = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      if (pendingAction === 'copy') {
        await navigator.clipboard.writeText(pipeline.code);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
        onAuditEvent('CI configuration copied', `${pipeline.filepath} · ${selectedFramework}.`);
      } else handleDownload();
      setShowValidation(false);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Could not export the CI file.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <Workflow className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-semibold text-slate-900">
              CI/CD Pipeline Generator
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Generate a CI configuration for the {selectedFramework.toUpperCase()} suite. Review the runner requirements and target URL before committing it.
          </p>
        </div>

        {/* CI Provider Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setSelectedTool('github-actions')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              selectedTool === 'github-actions'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            GitHub Actions
          </button>
          <button
            onClick={() => setSelectedTool('jenkins')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              selectedTool === 'jenkins'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Jenkins
          </button>
          <button
            onClick={() => setSelectedTool('gitlab-ci')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              selectedTool === 'gitlab-ci'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            GitLab CI
          </button>
        </div>
      </div>

      {/* Pipeline Config & Code Container */}
      <div className="flex flex-col bg-slate-950 text-slate-100">
        <div className="px-6 py-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-mono text-indigo-300 font-semibold">{pipeline.filepath}</span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400">{pipeline.description}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => openValidation('copy')}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors text-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy File'}
            </button>
            <button
              onClick={() => openValidation('download')}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
          </div>
        </div>

        {exportError && <p role="alert" className="border-b border-rose-200 bg-rose-50 px-6 py-2 text-xs text-rose-700">{exportError}</p>}

        {/* Code display */}
        <div className="p-6 overflow-x-auto max-h-[500px]">
          <pre className="font-mono text-xs text-slate-200 leading-relaxed">
            <code>{pipeline.code}</code>
          </pre>
        </div>

        {/* Bottom Feature callout */}
        <div className="px-6 py-3 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between text-2xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Framework-specific setup, target URL wiring, and test report artifacts are included where supported.</span>
          </div>
          <span className="font-mono text-slate-400">Engine: {selectedFramework}</span>
        </div>
      </div>
      {showValidation && <ValidationDialog findings={validationFindings} title={pendingAction === 'copy' ? 'Validate project before copying' : 'Validate project before download'} continueLabel={pendingAction === 'copy' ? 'Copy CI file' : 'Download CI file'} busy={isExporting} onClose={() => setShowValidation(false)} onContinue={continueAction} />}
    </div>
  );
};

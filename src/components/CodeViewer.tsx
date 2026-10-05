import React, { useState } from 'react';
import { 
  FileCode2, 
  Copy, 
  Check, 
  Download, 
  FolderTree, 
  Terminal,
  ExternalLink,
  Package,
  Github
} from 'lucide-react';
import { GeneratedCodeFile, FrameworkType, TestIR } from '../types/testAutomation';
import { exportSuiteAsZip } from '../utils/zipExporter';
import { GitHubPushModal } from './GitHubPushModal';

interface CodeViewerProps {
  files: GeneratedCodeFile[];
  selectedFramework: FrameworkType;
  onFrameworkChange: (framework: FrameworkType) => void;
  currentTestIR: TestIR;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  files,
  selectedFramework,
  onFrameworkChange,
  currentTestIR
}) => {
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);

  const activeFile = files[activeFileIndex] || files[0];

  const handleCopy = () => {
    if (activeFile?.code) {
      navigator.clipboard.writeText(activeFile.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadSingleFile = () => {
    const blob = new Blob([activeFile.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportZip = async () => {
    setIsExporting(true);
    try {
      await exportSuiteAsZip(files, selectedFramework, currentTestIR);
    } catch (err) {
      console.error('Failed to export zip', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <GitHubPushModal
        isOpen={isGitHubModalOpen}
        onClose={() => setIsGitHubModalOpen(false)}
      />

      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col h-[700px]">
        {/* Top Framework bar */}
        <div className="px-6 py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <FileCode2 className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">Generated Automation Repository</h2>
              <p className="text-xs text-slate-500">
                Clean Page Object Models, configuration harnesses, and typed test specs.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Push to GitHub CTA */}
            <button
              onClick={() => setIsGitHubModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors shadow-xs"
            >
              <Github className="w-3.5 h-3.5" />
              Push to GitHub
            </button>

            {/* Export Suite Zip CTA */}
            <button
              onClick={handleExportZip}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg text-xs font-medium transition-colors shadow-xs"
            >
              <Package className="w-3.5 h-3.5" />
              {isExporting ? 'Packaging...' : 'Export Suite (.zip)'}
            </button>

            {/* Framework Selector */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
              <button
                onClick={() => { onFrameworkChange('playwright-ts'); setActiveFileIndex(0); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  selectedFramework === 'playwright-ts'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Playwright (TS)
              </button>
              <button
                onClick={() => { onFrameworkChange('playwright-python'); setActiveFileIndex(0); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  selectedFramework === 'playwright-python'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Playwright (Python)
              </button>
              <button
                onClick={() => { onFrameworkChange('selenium-java'); setActiveFileIndex(0); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  selectedFramework === 'selenium-java'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Selenium (Java)
              </button>
              <button
                onClick={() => { onFrameworkChange('selenium-python'); setActiveFileIndex(0); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  selectedFramework === 'selenium-python'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Selenium (Python)
              </button>
            </div>
          </div>
        </div>

      {/* Editor Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: File Tree */}
        <div className="w-64 border-r border-slate-200 bg-slate-50/70 p-3 flex flex-col justify-between shrink-0">
          <div>
            <div className="text-2xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5 px-2">
              <FolderTree className="w-3.5 h-3.5" />
              Project Structure
            </div>

            <div className="space-y-1">
              {files.map((file, idx) => (
                <button
                  key={file.filepath}
                  onClick={() => setActiveFileIndex(idx)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition-colors flex items-center justify-between ${
                    activeFileIndex === idx
                      ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="truncate">{file.filepath}</span>
                  <span className="text-2xs text-slate-400 font-sans uppercase">
                    {file.language}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-lg text-2xs text-slate-500">
            <span className="font-semibold text-slate-700 block mb-0.5">Architecture Note:</span>
            Intermediate Representation keeps element references unified across frameworks and Page Object models.
          </div>
        </div>

        {/* Right Content: Code Viewer */}
        <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
          {/* File Header Bar */}
          <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono text-slate-300 font-medium">{activeFile?.filepath}</span>
              <span className="text-2xs text-slate-500 font-sans">
                ({activeFile?.description})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2.5 py-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded text-xs transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy Code'}
              </button>

              <button
                onClick={handleDownloadSingleFile}
                className="flex items-center gap-1.5 px-2.5 py-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded text-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download File
              </button>
            </div>
          </div>

          {/* Code Textarea / Viewer */}
          <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed text-slate-200">
            <pre className="whitespace-pre">
              <code>{activeFile?.code}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

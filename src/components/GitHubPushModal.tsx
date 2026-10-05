import React, { useState } from 'react';
import { 
  GitBranch, 
  Github, 
  ExternalLink, 
  Check, 
  Copy,
  ShieldCheck,
} from 'lucide-react';

interface GitHubPushModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GitHubPushModal: React.FC<GitHubPushModalProps> = ({
  isOpen,
  onClose
}) => {
  const [repoName, setRepoName] = useState('autotest-architect-studio');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const gitCommands = `# Run these commands from the project root:
git init
git add .
git commit -m "feat: AutoTest Architect - AI Test Automation Studio"

# Rename the branch to main
git branch -M main

# Create '${repoName}' on GitHub first, then link it:
git remote add origin https://github.com/jyotishsaha01/${repoName}.git

# Push to GitHub
git push -u origin main
`;

  const handleCopyCommands = () => {
    navigator.clipboard.writeText(gitCommands);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Push Application Code to Your GitHub
              </h3>
              <p className="text-2xs text-slate-500">
                Target GitHub account: <span className="font-semibold text-slate-700">https://github.com/jyotishsaha01</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 text-xs">
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3.5 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold text-indigo-950">
                Push this project from your local checkout
              </div>
              <p className="text-2xs text-indigo-800 leading-relaxed">
                Sign in to GitHub, create the repository, then run these commands from the project folder. Git uses your configured SSH key or credential manager for authentication.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-2xs font-semibold uppercase text-slate-500 mb-1">
              Target Repository Name
            </label>
            <div className="flex items-center gap-2">
              <span className="font-mono text-slate-500 bg-slate-100 px-2 py-1.5 rounded-lg border border-slate-200">
                github.com/jyotishsaha01/
              </span>
              <input
                type="text"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value.replace(/[^a-zA-Z0-9_\-]/g, ''))}
                className="flex-1 font-mono px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
              />
            </div>
          </div>

          {/* Quick Action 1: Create Repo on GitHub */}
          <div className="pt-2 flex items-center justify-between">
            <span className="text-slate-600 font-medium">1. Create new repo on your GitHub:</span>
            <a
              href={`https://github.com/new?name=${repoName}&description=AutoTest+Architect+-+AI+Multi-Modal+Test+Automation+Engineering+Platform`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors text-2xs"
            >
              <Github className="w-3.5 h-3.5" />
              Open github.com/new
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Quick Action 2: Terminal Commands */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">2. Terminal Push Commands:</span>
              <button
                onClick={handleCopyCommands}
                className="flex items-center gap-1 text-2xs text-indigo-600 hover:text-indigo-700 font-semibold"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Commands Copied!' : 'Copy Commands'}
              </button>
            </div>

            <div className="bg-slate-950 text-slate-200 p-3.5 rounded-xl font-mono text-2xs overflow-x-auto leading-relaxed border border-slate-800">
              <pre>{gitCommands}</pre>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-2xs text-slate-500">
            Run from the project root after creating the repository.
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-colors"
            >
              Close
            </button>

          </div>
        </div>
      </div>
    </div>
  );
};

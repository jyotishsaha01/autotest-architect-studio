import React from 'react';
import { AlertCircle, CheckCircle2, CircleAlert, ShieldCheck, X } from 'lucide-react';
import { ValidationFinding } from '../utils/suiteValidation';

interface ValidationDialogProps {
  findings: ValidationFinding[];
  onClose: () => void;
  onContinue: () => void;
  title?: string;
  continueLabel?: string;
  busy?: boolean;
}

export const ValidationDialog: React.FC<ValidationDialogProps> = ({ findings, onClose, onContinue, title = 'Validate before export', continueLabel = 'Continue export', busy = false }) => {
  const hasErrors = findings.some(finding => finding.status === 'error');
  const errorCount = findings.filter(finding => finding.status === 'error').length;
  const warningCount = findings.filter(finding => finding.status === 'warning').length;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="validation-title" className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><ShieldCheck className="h-5 w-5" /></div>
            <div><h2 id="validation-title" className="font-semibold text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-500">Check the target, generated project files, and CI configuration.</p></div>
          </div>
          <button aria-label="Close validation" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>
        </header>
        <div className="space-y-3 px-6 py-5">
          {findings.map((finding, index) => {
            const Icon = finding.status === 'pass' ? CheckCircle2 : finding.status === 'warning' ? CircleAlert : AlertCircle;
            const color = finding.status === 'pass' ? 'text-emerald-600' : finding.status === 'warning' ? 'text-amber-600' : 'text-rose-600';
            return <div key={`${finding.title}-${index}`} className="flex gap-3 rounded-xl border border-slate-200 p-3.5"><Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} /><div><p className="text-sm font-medium text-slate-800">{finding.title}</p><p className="mt-0.5 text-xs leading-5 text-slate-600">{finding.message}</p></div></div>;
          })}
          <p className="text-xs text-slate-500">This checks generated files and configuration locally. It does not run the suite or verify that your target application is reachable.</p>
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <p role="status" className={`text-xs ${hasErrors ? 'text-rose-700' : warningCount ? 'text-amber-700' : 'text-emerald-700'}`}>
            {hasErrors ? `${errorCount} issue${errorCount === 1 ? '' : 's'} must be fixed before export.` : warningCount ? `${warningCount} warning${warningCount === 1 ? '' : 's'} to review.` : 'All checks passed.'}
          </p>
          <div className="flex gap-2"><button onClick={onClose} disabled={busy} className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button><button onClick={onContinue} disabled={hasErrors || busy} className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300">{busy ? 'Working…' : warningCount ? 'Continue with warning' : continueLabel}</button></div>
        </footer>
      </section>
    </div>
  );
};

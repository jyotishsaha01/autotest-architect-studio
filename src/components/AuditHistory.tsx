import React from 'react';
import { Clock3, Code2, FileClock, ListChecks } from 'lucide-react';
import { AuditEvent } from '../types/audit';

interface AuditHistoryProps {
  events: AuditEvent[];
}

const eventIcons = {
  suite_created: ListChecks,
  suite_updated: FileClock,
  suite_extended: ListChecks,
  code_generated: Code2,
  code_exported: Code2
};

export const AuditHistory: React.FC<AuditHistoryProps> = ({ events }) => (
  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
      <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><Clock3 className="h-5 w-5" /></div><div><h2 className="font-semibold text-slate-900">Audit history</h2><p className="mt-0.5 text-sm text-slate-500">A timeline of suite changes and generated code activity.</p></div></div>
    </header>
    <div className="p-6">
      {!events.length ? <div className="rounded-xl border border-dashed border-slate-300 px-5 py-10 text-center"><Clock3 className="mx-auto h-6 w-6 text-slate-400" /><h3 className="mt-3 text-sm font-semibold text-slate-800">No activity recorded yet</h3><p className="mt-1 text-sm text-slate-500">Creating or updating a suite and generating code will appear here.</p></div> : <ol className="space-y-0">
        {events.map((event, index) => {
          const Icon = eventIcons[event.type];
          return <li key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
            {index < events.length - 1 && <span aria-hidden="true" className="absolute left-[17px] top-9 h-full w-px bg-slate-200" />}
            <span className="relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-indigo-600"><Icon className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1 rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="text-sm font-medium text-slate-900">{event.title}</h3><p className="mt-1 text-sm text-slate-600">{event.details}</p></div><time className="whitespace-nowrap text-xs text-slate-500" dateTime={event.timestamp}>{new Date(event.timestamp).toLocaleString()}</time></div>{event.testCaseId && <p className="mt-2 font-mono text-xs text-slate-500">{event.testCaseId}</p>}</div>
          </li>;
        })}
      </ol>}
      <p className="mt-6 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">History is stored in this browser on this device (up to 200 recent events). It does not contain generated source code and is not shared with other users or devices.</p>
    </div>
  </section>
);

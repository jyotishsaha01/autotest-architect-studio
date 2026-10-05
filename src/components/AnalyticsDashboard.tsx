import React from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CheckCircle2, ListChecks, Target } from 'lucide-react';
import { TestIR } from '../types/testAutomation';

interface AnalyticsDashboardProps {
  currentTestIR: TestIR;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ currentTestIR }) => {
  const actionCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    currentTestIR.steps.forEach((step) => counts.set(step.action, (counts.get(step.action) || 0) + 1));
    return [...counts].map(([action, count]) => ({ action: action.replaceAll('_', ' '), count }));
  }, [currentTestIR.steps]);

  const locatorCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    currentTestIR.steps.forEach((step) => {
      step.target?.locators?.forEach((locator) => counts.set(locator.strategy, (counts.get(locator.strategy) || 0) + 1));
    });
    return [...counts].map(([strategy, count]) => ({ strategy, count }));
  }, [currentTestIR.steps]);

  const locatedSteps = currentTestIR.steps.filter((step) => Boolean(step.target?.recommendedLocator)).length;
  const cards = [
    { title: 'Test steps', value: currentTestIR.steps.length, detail: 'In the active test case', icon: ListChecks },
    { title: 'Action types', value: actionCounts.length, detail: 'Represented in the active test case', icon: CheckCircle2 },
    { title: 'Steps with a locator', value: `${locatedSteps} / ${currentTestIR.steps.length}`, detail: 'Steps with a recommended selector', icon: Target },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Test analytics</h2>
        <p className="mt-1 text-sm text-slate-600">A summary of the active test case: {currentTestIR.testCaseId}.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map(({ title, value, detail, icon: Icon }) => (
          <section key={title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-sm font-medium text-slate-600">
              {title}
              <Icon aria-hidden="true" className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="mt-3 text-2xl font-semibold text-slate-900">{value}</div>
            <p className="mt-1 text-xs text-slate-500">{detail}</p>
          </section>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <h3 className="text-sm font-semibold text-slate-900">Actions in this test</h3>
          <p className="mt-1 text-xs text-slate-500">Counts are calculated from the active test steps.</p>
          {actionCounts.length ? (
            <div className="mt-5 h-64" role="img" aria-label="Action counts for active test case">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={actionCounts} layout="vertical" margin={{ top: 4, right: 16, left: 12, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis type="category" dataKey="action" width={100} tick={{ fontSize: 11, fill: '#475569' }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Steps" fill="#4f46e5" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="mt-6 text-sm text-slate-500">No test steps to summarize.</p>}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <h3 className="text-sm font-semibold text-slate-900">Locator candidates</h3>
          <p className="mt-1 text-xs text-slate-500">Selector strategies included in the active test IR.</p>
          {locatorCounts.length ? (
            <div className="mt-5 h-64" role="img" aria-label="Locator candidate counts for active test case">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={locatorCounts} layout="vertical" margin={{ top: 4, right: 16, left: 12, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis type="category" dataKey="strategy" width={100} tick={{ fontSize: 11, fill: '#475569' }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Candidates" fill="#0f766e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="mt-6 text-sm text-slate-500">No locator candidates are available for this test.</p>}
        </section>
      </div>
    </div>
  );
};

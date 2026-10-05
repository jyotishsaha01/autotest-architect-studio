import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';
import { 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  ShieldCheck, 
  Zap, 
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { TestIR } from '../types/testAutomation';

interface AnalyticsDashboardProps {
  currentTestIR: TestIR;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ currentTestIR }) => {
  // Sprints historical performance
  const sprintTrendData = [
    { sprint: 'Sprint 21', passed: 18, failed: 6, healed: 2, total: 24, passRate: 75 },
    { sprint: 'Sprint 22', passed: 25, failed: 4, healed: 5, total: 29, passRate: 86 },
    { sprint: 'Sprint 23', passed: 32, failed: 5, healed: 7, total: 37, passRate: 86 },
    { sprint: 'Sprint 24', passed: 41, failed: 3, healed: 8, total: 44, passRate: 93 },
    { sprint: 'Sprint 25 (Active)', passed: 48, failed: 2, healed: 11, total: 50, passRate: 96 },
  ];

  // Test Step Action Coverage in current Test IR
  const actionDistribution = React.useMemo(() => {
    const counts: Record<string, number> = {};
    currentTestIR.steps.forEach(s => {
      const act = s.action || 'custom';
      counts[act] = (counts[act] || 0) + 1;
    });

    const colors: Record<string, string> = {
      navigate: '#6366f1',
      fill: '#3b82f6',
      click: '#06b6d4',
      assert_visible: '#10b981',
      assert_text: '#8b5cf6',
      select: '#f59e0b',
      check: '#ec4899',
    };

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: colors[name] || '#94a3b8'
    }));
  }, [currentTestIR]);

  // ROI / Manual Testing Hours Saved vs AI Automated Generation
  const roiData = [
    { month: 'May', manualHours: 140, aiAutoHours: 24, costSavedUsd: 5800 },
    { month: 'Jun', manualHours: 165, aiAutoHours: 20, costSavedUsd: 7250 },
    { month: 'Jul', manualHours: 190, aiAutoHours: 18, costSavedUsd: 8600 },
    { month: 'Aug', manualHours: 220, aiAutoHours: 16, costSavedUsd: 10200 },
    { month: 'Sep', manualHours: 250, aiAutoHours: 14, costSavedUsd: 11800 },
    { month: 'Oct', manualHours: 290, aiAutoHours: 12, costSavedUsd: 13900 },
  ];

  // Locator Resilience Ranking distribution
  const locatorResilienceData = [
    { strategy: 'data-testid / stable ID', count: 18, resilience: 'High' },
    { strategy: 'ARIA Role + Accessible Name', count: 14, resilience: 'High' },
    { strategy: 'Placeholder / Label Text', count: 8, resilience: 'Medium' },
    { strategy: 'Clean Hierarchical CSS', count: 5, resilience: 'Medium' },
    { strategy: 'Relative Dynamic XPath', count: 2, resilience: 'Low' },
  ];

  return (
    <div className="space-y-6">
      {/* Top ROI KPI Metrics Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Test Suite Automation Coverage</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">94.8%</div>
          <div className="text-2xs text-emerald-600 font-medium flex items-center gap-1 mt-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            +12.4% coverage since Sprint 22
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Pass Rate Across Sprints</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">96.0%</div>
          <div className="text-2xs text-emerald-600 font-medium flex items-center gap-1 mt-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            2 failures, 11 autonomous self-heals
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Engineering QA Hours Saved</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">278 hrs</div>
          <div className="text-2xs text-slate-500 font-medium mt-1">
            Replaced manual regression cycles
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Calculated QA ROI</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">$57,550</div>
          <div className="text-2xs text-emerald-600 font-medium flex items-center gap-1 mt-1">
            <TrendingUp className="w-3.5 h-3.5" />
            Estimated net cost reduction
          </div>
        </div>
      </div>

      {/* Main Charts Row 1: Sprint Pass/Fail/Healed + ROI Over Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sprint Pass/Fail Trends */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Sprint-by-Sprint Execution &amp; Healing</h3>
              <p className="text-xs text-slate-500">Passed, failed, and autonomously repaired tests per sprint cycle.</p>
            </div>
            <span className="text-2xs font-mono font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
              Trend: Upward
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sprintTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="sprint" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#f8fafc', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="passed" name="Passed" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="healed" name="Self-Healed" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="failed" name="Failed" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Automation ROI Over Time */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Automation ROI: Manual Hours vs. AI Automation</h3>
              <p className="text-xs text-slate-500">Cumulative labor hours saved per release window.</p>
            </div>
            <span className="text-2xs font-mono font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
              95.8% Efficiency
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={roiData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorManual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAI" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#f8fafc', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="manualHours" name="Manual QA Hours (Baseline)" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorManual)" />
                <Area type="monotone" dataKey="aiAutoHours" name="AutoTest Architect Hours" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorAI)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Action Breakdown & Locator Strategy Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Action Type Breakdown in Active Test IR */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Current Test IR Action Breakdown</h3>
            <p className="text-xs text-slate-500">Distribution of interaction vs assertion steps in {currentTestIR.testCaseId}.</p>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={actionDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {actionDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#f8fafc', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Locator Resilience Ranking */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Locator Resilience &amp; Flakiness Risk Matrix</h3>
                <p className="text-xs text-slate-500">Distribution of locator strategies ranked by immunity to future UI refactoring.</p>
              </div>
              <span className="text-2xs font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded">
                Tier-1 Preferred
              </span>
            </div>

            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={locatorResilienceData} layout="vertical" margin={{ top: 5, right: 30, left: 120, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} />
                  <YAxis type="category" dataKey="strategy" tick={{ fontSize: 11, fill: '#475569' }} axisLine={{ stroke: '#e2e8f0' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#f8fafc', fontSize: '11px' }}
                  />
                  <Bar dataKey="count" name="Target Elements Count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-2xs text-slate-500">
            <span>High-resilience locators (testid + ARIA roles) safeguard against 92% of sprint locator drifts.</span>
            <span className="font-semibold text-slate-700">Audit Status: Compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
};

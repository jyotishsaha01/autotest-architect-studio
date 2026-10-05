import React, { useState } from 'react';
import { 
  Network, 
  Search, 
  Tag, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { UIElementModel, TestIR } from '../types/testAutomation';

interface KnowledgeGraphProps {
  elements: UIElementModel[];
  currentTestIR: TestIR;
}

export const KnowledgeGraphViewer: React.FC<KnowledgeGraphProps> = ({
  elements,
  currentTestIR
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedElement, setSelectedElement] = useState<UIElementModel | null>(elements[0] || null);

  const filtered = elements.filter(el => 
    el.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    el.semanticId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    el.primaryLocator.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
        <div>
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Network className="w-5 h-5 text-indigo-600" />
            UI Semantic Knowledge Graph
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Decouples test logic from fragile DOM selectors. When UI evolves in Sprint 2, the semantic identifier remains stable while candidate locators are updated.
          </p>
        </div>

        <div className="relative w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search semantic elements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
        {/* Element List */}
        <div className="p-4 max-h-[450px] overflow-y-auto space-y-2">
          <div className="text-2xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Registered Semantic Entities ({filtered.length})
          </div>

          {filtered.map(el => (
            <button
              key={el.semanticId}
              onClick={() => setSelectedElement(el)}
              className={`w-full text-left p-3 rounded-lg border text-xs transition-all ${
                selectedElement?.semanticId === el.semanticId
                  ? 'border-indigo-500 bg-indigo-50/50 text-indigo-950 shadow-2xs'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
              }`}
            >
              <div className="font-semibold">{el.businessName}</div>
              <div className="font-mono text-2xs text-indigo-600 truncate mt-0.5">
                {el.semanticId}
              </div>
              <div className="text-2xs text-slate-500 mt-1 flex items-center justify-between">
                <span>Page: {el.page}</span>
                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                  {el.role}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Selected Details */}
        <div className="p-6 md:col-span-2 space-y-5">
          {selectedElement ? (
            <>
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">
                    {selectedElement.businessName}
                  </h3>
                  <span className="text-xs font-mono font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {selectedElement.lastUpdatedSprint}
                  </span>
                </div>
                <div className="font-mono text-xs text-slate-500 mt-0.5">
                  Semantic ID: <span className="text-slate-800 font-semibold">{selectedElement.semanticId}</span>
                </div>
              </div>

              {/* Primary Locator */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Primary Locator Strategy (Highest Confidence)</label>
                <div className="p-2.5 bg-slate-900 text-emerald-400 font-mono text-xs rounded-lg flex items-center justify-between">
                  <span>{selectedElement.primaryLocator}</span>
                  <span className="text-2xs bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800">
                    Rank 1
                  </span>
                </div>
              </div>

              {/* Fallback Strategies */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Multi-Tier Fallback Locators</label>
                <div className="space-y-1.5">
                  {selectedElement.fallbackLocators.map((loc, idx) => (
                    <div key={idx} className="p-2 bg-slate-50 border border-slate-200 rounded text-xs font-mono text-slate-700 flex items-center justify-between">
                      <span>{loc}</span>
                      <span className="text-2xs text-slate-400 font-sans">Tier {idx + 2}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Architecture Explanation */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  Self-Healing & Sprint Resilience
                </div>
                <p className="text-2xs leading-relaxed text-amber-700">
                  When developers refactor HTML in future sprints (e.g. changing tags, wrapping buttons in divs, or switching classes), the system resolves the element through its semantic identity rather than breaking the entire test suite.
                </p>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-slate-400">
              Select an element to inspect semantic locators and resilience mapping.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

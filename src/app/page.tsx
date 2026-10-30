'use client';

import React, { useState, useEffect } from 'react';
import {
  ResearchApiResponse,
  VerifiedClaim,
  FinalVerdict,
} from '@/lib/schema';
import { generateMarkdownReport, generateJsonReport } from '@/lib/report';
import {
  Search,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FileText,
  Cpu,
  Layers,
  Terminal,
  RefreshCw,
  Info,
  Download,
  ChevronDown,
  ChevronUp,
  Compass,
  Sparkles,
  Clock,
  Check,
  AlertTriangle,
} from 'lucide-react';

const SUGGESTED_QUESTIONS = [
  'What are the key architecture features and latency benefits of NVIDIA Nemotron-3.5-Lightning?',
  'How does deterministic quote provenance prevent AI hallucinations in automated research?',
  'What are the reported compute efficiency and memory scaling metrics of NVIDIA Blackwell GPUs?',
];

const PIPELINE_STAGES = [
  { id: 1, name: 'Research Planning', desc: 'Nemotron formulates targeted search strategy & focus areas' },
  { id: 2, name: 'Web Retrieval', desc: 'Tavily retrieves authoritative pages with full body text' },
  { id: 3, name: 'Synthesis & Claims', desc: 'Nemotron drafts answer and extracts discrete candidate quotes' },
  { id: 4, name: 'Provenance Gating', desc: 'Deterministic code verifies exact quote substring in source' },
  { id: 5, name: 'Semantic Certification', desc: 'Nemotron evaluates meaning for provenance-approved quotes only' },
];

export default function ResearchPage() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [data, setData] = useState<ResearchApiResponse | null>(null);
  const [expandedClaims, setExpandedClaims] = useState<Record<string, boolean>>({});
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [error, setError] = useState<{
    title: string;
    message: string;
    missingVariables?: string[];
    instructions?: string[];
  } | null>(null);

  // Timer for elapsed pipeline execution time
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      setElapsedSeconds(0);
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  async function handleVerify(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const query = question.trim();
    if (!query || query.length < 3) return;

    setLoading(true);
    setError(null);
    setData(null);
    setExpandedClaims({});
    setActiveStageIndex(0);

    // Dynamic progress stage timeline
    const t1 = setTimeout(() => setActiveStageIndex(1), 3000);
    const t2 = setTimeout(() => setActiveStageIndex(2), 6500);
    const t3 = setTimeout(() => setActiveStageIndex(3), 11000);
    const t4 = setTimeout(() => setActiveStageIndex(4), 15000);

    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw {
          title: json.error || 'Verification Request Failed',
          message: json.message || 'An unexpected error occurred during research verification.',
          missingVariables: json.missingVariables,
          instructions: json.instructions,
        };
      }

      setData(json);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'title' in err) {
        setError(err as { title: string; message: string; missingVariables?: string[]; instructions?: string[] });
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        setError({
          title: 'Pipeline Error',
          message: msg,
        });
      }
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      setLoading(false);
    }
  }

  function toggleClaimExpansion(claimId: string) {
    setExpandedClaims((prev) => ({
      ...prev,
      [claimId]: !prev[claimId],
    }));
  }

  function toggleAllClaims() {
    if (!data) return;
    const allExpanded = data.claims.every((c) => expandedClaims[c.id]);
    const nextState: Record<string, boolean> = {};
    data.claims.forEach((c) => {
      nextState[c.id] = !allExpanded;
    });
    setExpandedClaims(nextState);
  }

  function downloadReport(format: 'markdown' | 'json') {
    if (!data) return;

    let content = '';
    let filename = '';
    let mimeType = '';

    if (format === 'markdown') {
      content = generateMarkdownReport(data);
      filename = `flowpilot-verify-report-${Date.now()}.md`;
      mimeType = 'text/markdown;charset=utf-8;';
    } else {
      content = generateJsonReport(data);
      filename = `flowpilot-verify-report-${Date.now()}.json`;
      mimeType = 'application/json;charset=utf-8;';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess(format.toUpperCase());
    setTimeout(() => setDownloadSuccess(null), 3000);
  }

  function getVerdictBadge(verdict: FinalVerdict) {
    switch (verdict) {
      case 'Supported':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Supported
          </span>
        );
      case 'Contradicted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5 shrink-0" /> Contradicted
          </span>
        );
      case 'Insufficient Evidence':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <HelpCircle className="w-3.5 h-3.5 shrink-0" /> Insufficient Evidence
          </span>
        );
      case 'Unverified':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-500/20 text-slate-300 border border-slate-500/30" title="Deterministic quote provenance failed. Model certification strictly prohibited.">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" /> Unverified (Provenance Failed)
          </span>
        );
    }
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 bg-[#0c1222]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                FlowPilot Verify
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                  V2 Production
                </span>
              </span>
              <p className="text-xs text-slate-400 hidden sm:block">
                Code verifies provenance. Nemotron evaluates meaning.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline text-slate-300 font-semibold">Model:</span>
              <span className="text-slate-200">nvidia/Nemotron-3_5-Lightning</span>
            </div>
            <div className="hidden lg:flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md">
              <Search className="w-3.5 h-3.5 text-indigo-400" />
              <span>Tavily Live Search</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Research Input Card */}
        <section className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 shadow-xl shadow-black/40">
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="research-input" className="block text-sm font-semibold text-slate-200">
                  Research Question or Empirical Hypothesis
                </label>
                <span className="text-xs text-slate-500 font-mono">
                  Gated deterministic quote auditing
                </span>
              </div>
              <div className="relative">
                <input
                  id="research-input"
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g. What are the key architecture features and latency benefits of NVIDIA Nemotron-3.5-Lightning?"
                  className="w-full bg-[#090d16] border border-slate-700/80 rounded-xl px-4 py-3.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Suggested:</span>
                {SUGGESTED_QUESTIONS.map((sq, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setQuestion(sq)}
                    className="text-xs text-slate-400 bg-slate-800/60 hover:bg-slate-800 hover:text-slate-200 border border-slate-700/50 rounded-lg px-2.5 py-1 transition-colors text-left truncate max-w-[280px]"
                    title={sq}
                  >
                    {sq}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="submit"
                  disabled={loading || question.trim().length < 3}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 font-semibold text-sm text-white shadow-lg shadow-indigo-600/25 transition-all duration-150 cursor-pointer disabled:cursor-not-allowed shrink-0"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Verifying Research ({elapsedSeconds}s)...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-white" />
                      <span>Verify Research</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* V2 Pipeline Progress Tracker */}
          {loading && (
            <div className="mt-6 pt-6 border-t border-slate-800/80 space-y-4">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-indigo-400 flex items-center gap-2 font-semibold">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Step {activeStageIndex + 1} of 5: {PIPELINE_STAGES[activeStageIndex].name}
                </span>
                <span className="text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  Elapsed: {elapsedSeconds}s
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {PIPELINE_STAGES.map((stg, idx) => {
                  const isCurrent = idx === activeStageIndex;
                  const isCompleted = idx < activeStageIndex;
                  return (
                    <div
                      key={stg.id}
                      className={`p-2.5 rounded-lg border text-xs transition-all ${
                        isCurrent
                          ? 'bg-indigo-950/40 border-indigo-500/60 text-indigo-300'
                          : isCompleted
                          ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400'
                          : 'bg-slate-900/40 border-slate-800 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold mb-1">
                        {isCompleted ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : isCurrent ? (
                          <RefreshCw className="w-3 h-3 text-indigo-400 animate-spin shrink-0" />
                        ) : (
                          <span className="w-3.5 h-3.5 rounded-full border border-slate-700 flex items-center justify-center text-[9px]">
                            {idx + 1}
                          </span>
                        )}
                        <span>{stg.name}</span>
                      </div>
                      <p className="text-[10px] leading-tight opacity-80">{stg.desc}</p>
                    </div>
                  );
                })}
              </div>

              <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-indigo-500 via-emerald-400 to-indigo-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (activeStageIndex + 1) * 20)}%` }}
                />
              </div>
            </div>
          )}
        </section>

        {/* Error / Provider Failure Banner with Retry */}
        {error && (
          <section className="bg-rose-950/30 border border-rose-500/40 rounded-2xl p-6 text-rose-200 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-rose-300">{error.title}</h3>
                  <p className="text-sm text-rose-200/90">{error.message}</p>
                </div>
              </div>
              <button
                onClick={() => handleVerify()}
                className="px-3.5 py-1.5 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-xs font-semibold text-rose-100 border border-rose-700/60 inline-flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </button>
            </div>

            {error.missingVariables && error.missingVariables.length > 0 && (
              <div className="bg-[#090d16] border border-rose-900/60 rounded-xl p-4 text-xs font-mono space-y-2">
                <div className="text-slate-400 font-bold flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-amber-400" />
                  Required Configuration to Run Locally:
                </div>
                <p className="text-slate-300">
                  Create a <code className="text-emerald-400">.env.local</code> file in the project root with:
                </p>
                <div className="bg-black/60 p-3 rounded border border-slate-800 text-slate-200 select-all space-y-1">
                  <div>NEBIUS_API_KEY=&lt;your_nebius_token_factory_key&gt;</div>
                  <div>NEBIUS_BASE_URL=https://api.tokenfactory.eu-north1.nebius.com/v1/</div>
                  <div>NEBIUS_MODEL_ID=nvidia/Nemotron-3_5-Lightning</div>
                  <div>TAVILY_API_KEY=&lt;your_tavily_api_key&gt;</div>
                </div>
                {error.instructions && (
                  <ul className="list-disc list-inside text-slate-400 space-y-1 pt-1">
                    {error.instructions.map((inst, i) => (
                      <li key={i}>{inst}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
        )}

        {/* Empty State when no query run yet */}
        {!loading && !data && !error && (
          <section className="border border-dashed border-slate-800 rounded-2xl p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-slate-800/80 mx-auto flex items-center justify-center text-indigo-400">
              <Compass className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-base font-bold text-slate-200">Verification-First Research Ready</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Enter any technical or empirical question above. FlowPilot Verify uses NVIDIA Nemotron-3.5-Lightning on Nebius Token Factory with deterministic code quote provenance gating to eliminate hallucinations.
              </p>
            </div>
          </section>
        )}

        {/* Pipeline Results View */}
        {data && (
          <div className="space-y-8">
            {/* Top Summary Bar & Download Controls */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    Verified Research Dossier
                  </h2>
                  <span className="text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-0.5 rounded-md">
                    {data.metadata.durationMs}ms
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadReport('markdown')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
                    title="Export report in GitHub Flavored Markdown format"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-400" />
                    Export Markdown
                  </button>
                  <button
                    onClick={() => downloadReport('json')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
                    title="Export report in JSON data format"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    Export JSON
                  </button>
                </div>
              </div>

              {downloadSuccess && (
                <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl px-4 py-2 text-xs font-mono text-emerald-300 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  Successfully generated and downloaded {downloadSuccess} research report!
                </div>
              )}

              {/* Metrics Grid */}
              <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 text-center">
                  <span className="text-xs text-slate-400 uppercase tracking-wider block">Total Claims</span>
                  <span className="text-2xl font-bold font-mono text-white mt-1 block">
                    {data.summary.totalClaims}
                  </span>
                </div>
                <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 text-center">
                  <span className="text-xs text-slate-400 uppercase tracking-wider block">Provenance Pass</span>
                  <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">
                    {data.summary.provenancePassRate}%
                  </span>
                </div>
                <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 text-center">
                  <span className="text-xs text-slate-400 uppercase tracking-wider block">Supported</span>
                  <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">
                    {data.summary.supportedCount}
                  </span>
                </div>
                <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 text-center">
                  <span className="text-xs text-slate-400 uppercase tracking-wider block">Contradicted</span>
                  <span className="text-2xl font-bold font-mono text-rose-400 mt-1 block">
                    {data.summary.contradictedCount}
                  </span>
                </div>
                <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 text-center">
                  <span className="text-xs text-slate-400 uppercase tracking-wider block">Insufficient</span>
                  <span className="text-2xl font-bold font-mono text-amber-400 mt-1 block">
                    {data.summary.insufficientCount}
                  </span>
                </div>
                <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 text-center">
                  <span className="text-xs text-slate-400 uppercase tracking-wider block">Unverified</span>
                  <span className="text-2xl font-bold font-mono text-slate-400 mt-1 block">
                    {data.summary.unverifiedCount}
                  </span>
                </div>
              </section>
            </div>

            {/* Research Plan & Final Findings Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Nemotron Research Plan */}
              {data.plan && (
                <section className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                      <Compass className="w-4 h-4 text-indigo-400" />
                      Nemotron Research Plan
                    </h3>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Step 1 Approved
                    </span>
                  </div>
                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="font-semibold text-slate-400 block mb-1">Target Search Queries Formulated:</span>
                      <div className="space-y-1">
                        {data.plan.searchQueries.map((q, i) => (
                          <div key={i} className="font-mono text-slate-200 bg-slate-900/80 px-2.5 py-1 rounded border border-slate-800/80 text-[11px]">
                            &gt; {q}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="font-semibold text-slate-400 block mb-1">Empirical Focus Areas:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {data.plan.focusAreas.map((fa, i) => (
                          <span key={i} className="bg-indigo-950/40 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded text-[11px]">
                            {fa}
                          </span>
                        ))}
                      </div>
                    </div>

                    {data.plan.methodologyNotes && (
                      <p className="text-slate-400 text-[11px] italic pt-1">
                        Methodology: {data.plan.methodologyNotes}
                      </p>
                    )}
                  </div>
                </section>
              )}

              {/* Verified Findings Summary */}
              <section className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Verified Findings Summary
                  </h3>
                  <span className="text-[10px] font-mono text-slate-400">
                    Provenance Gated
                  </span>
                </div>
                <div className="text-xs leading-relaxed text-slate-300 space-y-2">
                  <p className="font-medium text-slate-200">
                    {data.findingsSummary || 'Factual analysis completed with deterministic quote verification.'}
                  </p>
                  <div className="bg-[#090d16] p-3 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                    <div className="flex items-center justify-between text-slate-300 font-semibold">
                      <span>Deterministic Gate Pass Rate</span>
                      <span className="text-emerald-400 font-mono">{data.summary.provenancePassRate}%</span>
                    </div>
                    <p>
                      {data.summary.unverifiedCount > 0
                        ? `${data.summary.unverifiedCount} candidate claim(s) failed quote verification and were permanently excluded from semantic certification.`
                        : '100% of candidate quotes were matched verbatim in retrieved source documents.'}
                    </p>
                  </div>
                </div>
              </section>
            </div>

            {/* Synthesized Research Answer */}
            <section className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  Synthesized Research Answer
                </h2>
                <span className="text-xs font-mono text-slate-500">
                  Model: {data.metadata.modelId}
                </span>
              </div>
              <div className="text-sm leading-relaxed text-slate-200 whitespace-pre-line">
                {data.answer}
              </div>
            </section>

            {/* CENTERPIECE: Claim Verification Table with Expandable Reasoning */}
            <section className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-emerald-400" />
                    Claim-Verification Table
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Individual claim breakdown with code-verified quote provenance and Nemotron semantic judgements.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleAllClaims}
                    className="text-xs text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    {data.claims.every((c) => expandedClaims[c.id]) ? 'Collapse All Reasoning' : 'Expand All Reasoning'}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase tracking-wider bg-slate-900/50">
                      <th className="py-3 px-4 w-[28%]">Claim</th>
                      <th className="py-3 px-3 w-[18%]">Code Provenance</th>
                      <th className="py-3 px-3 w-[18%]">Semantic Verdict</th>
                      <th className="py-3 px-4 w-[36%]">Evidence Quote &amp; Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {data.claims.map((claim: VerifiedClaim, idx: number) => {
                      const isExpanded = Boolean(expandedClaims[claim.id]);
                      return (
                        <React.Fragment key={claim.id || idx}>
                          <tr className="hover:bg-slate-800/30 transition-colors">
                            {/* Claim Text */}
                            <td className="py-4 px-4 align-top">
                              <span className="font-semibold text-slate-200 text-sm leading-snug block">
                                {claim.claimText}
                              </span>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="font-mono text-[10px] text-slate-500">
                                  ID: {claim.id}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => toggleClaimExpansion(claim.id)}
                                  className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                                >
                                  {isExpanded ? (
                                    <>
                                      <span>Hide reasoning</span>
                                      <ChevronUp className="w-3 h-3" />
                                    </>
                                  ) : (
                                    <>
                                      <span>View reasoning</span>
                                      <ChevronDown className="w-3 h-3" />
                                    </>
                                  )}
                                </button>
                              </div>
                            </td>

                            {/* Deterministic Provenance */}
                            <td className="py-4 px-3 align-top">
                              {claim.provenance.isValid ? (
                                <div className="space-y-1">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                    <CheckCircle2 className="w-3 h-3" />
                                    {claim.provenance.matchType === 'EXACT' ? 'Verbatim Match' : 'Normalized'}
                                  </span>
                                  <p className="text-[11px] text-slate-400 leading-tight">
                                    Code verified in source
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                    <XCircle className="w-3 h-3" />
                                    Provenance Failed
                                  </span>
                                  <p className="text-[11px] text-rose-300/80 leading-tight">
                                    Gated: Not in source
                                  </p>
                                </div>
                              )}
                            </td>

                            {/* Semantic Verdict */}
                            <td className="py-4 px-3 align-top space-y-1.5">
                              <div>{getVerdictBadge(claim.verdict)}</div>
                              {claim.verdict !== 'Unverified' && claim.confidence > 0 && (
                                <span className="font-mono text-[10px] text-slate-400 block">
                                  Confidence: {claim.confidence}%
                                </span>
                              )}
                              <p className="text-[11px] text-slate-300 leading-tight">
                                {claim.verdictExplanation}
                              </p>
                            </td>

                            {/* Evidence Quote & Source */}
                            <td className="py-4 px-4 align-top space-y-2">
                              <blockquote className="bg-[#090d16] border-l-2 border-indigo-500/80 p-2.5 rounded-r text-slate-300 italic text-xs leading-relaxed">
                                &ldquo;{claim.candidateQuote}&rdquo;
                              </blockquote>
                              <div>
                                <a
                                  href={claim.sourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 underline underline-offset-2 break-all"
                                >
                                  <ExternalLink className="w-3 h-3 shrink-0" />
                                  {claim.sourceUrl}
                                </a>
                              </div>
                            </td>
                          </tr>

                          {/* Expandable Reasoning Details Row */}
                          {isExpanded && (
                            <tr className="bg-slate-900/60 border-b border-slate-800">
                              <td colSpan={4} className="p-4 space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                  <div className="bg-[#090d16] p-3 rounded-xl border border-slate-800 space-y-1.5">
                                    <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                      Deterministic Provenance Audit Details:
                                    </span>
                                    <p className="text-slate-400 leading-relaxed font-mono text-[11px]">
                                      {claim.provenance.details}
                                    </p>
                                    <div className="text-[10px] text-slate-500 pt-1">
                                      Match Strategy: {claim.provenance.matchType} &bull; Source URL Allowlisted: {claim.provenance.sourceUrlValid ? 'YES' : 'NO'}
                                    </div>
                                  </div>

                                  <div className="bg-[#090d16] p-3 rounded-xl border border-slate-800 space-y-1.5">
                                    <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                                      <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                                      Nemotron Semantic Reasoning:
                                    </span>
                                    <p className="text-slate-300 leading-relaxed">
                                      {claim.verdictExplanation}
                                    </p>
                                    <div className="text-[10px] text-slate-500 pt-1">
                                      Assigned Verdict: <strong className="text-slate-200">{claim.verdict}</strong> &bull; Score: {claim.confidence}%
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Retrieved Sources & Audit Notes / Limitations */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Retrieved Sources */}
              <section className="lg:col-span-2 bg-[#0f172a] border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Search className="w-4 h-4 text-indigo-400" />
                    Retrieved Research Sources ({data.sources.length})
                  </h3>
                  <span className="text-xs font-mono text-slate-500">
                    Untrusted Web Corpus
                  </span>
                </div>
                <div className="space-y-3">
                  {data.sources.map((src, i) => (
                    <div key={i} className="bg-[#090d16] border border-slate-800/80 rounded-xl p-4 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-semibold text-slate-200 text-sm">{src.title}</h4>
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-indigo-400 transition-colors p-1"
                          title="Open external source"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                        {src.snippet}
                      </p>
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1">
                        <span className="truncate max-w-[80%]">{src.url}</span>
                        <span>{src.content ? `${Math.round(src.content.length / 1024)} KB body` : 'Snippet only'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Research Limitations & Audit Notes */}
              <section className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-400" />
                  Audit Notes &amp; Limitations
                </h3>
                <div className="text-xs text-slate-300 leading-relaxed space-y-3">
                  <div className="bg-[#090d16] p-3 rounded-xl border border-slate-800/80">
                    <p className="font-semibold text-slate-200 mb-1">Untrusted Input Invariant:</p>
                    <p className="text-slate-400">
                      All retrieved web content is treated strictly as untrusted text. Embedded instructions or prompt injections inside source bodies are completely ignored.
                    </p>
                  </div>
                  {data.limitations && (
                    <div className="bg-[#090d16] p-3 rounded-xl border border-slate-800/80">
                      <p className="font-semibold text-slate-200 mb-1">Identified Evidence Gaps:</p>
                      <p className="text-slate-400">{data.limitations}</p>
                    </div>
                  )}
                  <div className="bg-[#090d16] p-3 rounded-xl border border-slate-800/80">
                    <p className="font-semibold text-slate-200 mb-1">Deterministic Provenance Gating:</p>
                    <p className="text-slate-400">
                      Any candidate quote not found verbatim or normalized in retrieved source text is classified as <span className="text-slate-200 font-mono font-semibold">Unverified</span> and rejected from model certification.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 mt-12 bg-[#090d16] text-xs text-slate-500 text-center font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>FlowPilot Verify V2 &bull; NVIDIA &amp; Nebius Hackathon 2026 Submission</span>
          <span>NVIDIA Nemotron-3.5-Lightning on Nebius Token Factory &bull; Tavily Live Search</span>
        </div>
      </footer>
    </div>
  );
}

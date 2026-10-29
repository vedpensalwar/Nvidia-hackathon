'use client';

import React, { useState } from 'react';
import {
  ResearchApiResponse,
  VerifiedClaim,
  FinalVerdict,
} from '@/lib/schema';
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
  ArrowRight,
  Terminal,
  RefreshCw,
  Info,
} from 'lucide-react';

const SUGGESTED_QUESTIONS = [
  'What are the key architecture features and latency benefits of NVIDIA Nemotron-3.5-Lightning?',
  'How does deterministic quote provenance prevent AI hallucinations in automated research?',
  'What are the reported compute efficiency and memory scaling metrics of NVIDIA Blackwell GPUs?',
];

export default function ResearchPage() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [progressStage, setProgressStage] = useState('');
  const [data, setData] = useState<ResearchApiResponse | null>(null);
  const [error, setError] = useState<{
    title: string;
    message: string;
    missingVariables?: string[];
    instructions?: string[];
  } | null>(null);

  async function handleVerify(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const query = question.trim();
    if (!query || query.length < 3) return;

    setLoading(true);
    setError(null);
    setData(null);

    // Dynamic progress stage updates
    setProgressStage('Querying Tavily Search API for authoritative sources...');
    const stageTimer1 = setTimeout(() => {
      setProgressStage('NVIDIA Nemotron-3.5-Lightning drafting synthesis & extracting claims...');
    }, 4000);
    const stageTimer2 = setTimeout(() => {
      setProgressStage('Running deterministic code quote provenance verification on server...');
    }, 8500);
    const stageTimer3 = setTimeout(() => {
      setProgressStage('Nemotron evaluating semantic claim verdicts for proven claims...');
    }, 13000);

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
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      clearTimeout(stageTimer3);
      setLoading(false);
      setProgressStage('');
    }
  }

  function getVerdictBadge(verdict: FinalVerdict) {
    switch (verdict) {
      case 'Supported':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> Supported
          </span>
        );
      case 'Contradicted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5" /> Contradicted
          </span>
        );
      case 'Insufficient Evidence':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <HelpCircle className="w-3.5 h-3.5" /> Insufficient Evidence
          </span>
        );
      case 'Unverified':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-500/20 text-slate-300 border border-slate-500/30">
            <AlertCircle className="w-3.5 h-3.5" /> Unverified (Provenance Failed)
          </span>
        );
    }
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans">
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
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  MVP V1
                </span>
              </span>
              <p className="text-xs text-slate-400">
                Code verifies provenance. Nemotron evaluates meaning.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
            <span className="hidden sm:flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              nvidia/Nemotron-3_5-Lightning
            </span>
            <span className="hidden sm:flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md">
              <Search className="w-3.5 h-3.5 text-indigo-400" />
              Tavily Live Search
            </span>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Research Input Card */}
        <section className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 shadow-xl shadow-black/40">
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label htmlFor="research-input" className="block text-sm font-medium text-slate-300 mb-2">
                Enter Research Question or Hypothesis
              </label>
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
                <span className="text-xs text-slate-500 font-medium">Try:</span>
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

              <button
                type="submit"
                disabled={loading || question.trim().length < 3}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 font-semibold text-sm text-white shadow-lg shadow-indigo-600/25 transition-all duration-150 cursor-pointer disabled:cursor-not-allowed shrink-0"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Verifying Research...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-white" />
                    <span>Verify Research</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Loading Indicator */}
          {loading && (
            <div className="mt-6 pt-6 border-t border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-indigo-400 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  {progressStage}
                </span>
                <span className="text-slate-500">Executing server-side pipeline</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-500 via-emerald-500 to-indigo-500 h-1.5 rounded-full animate-pulse w-full" />
              </div>
            </div>
          )}
        </section>

        {/* Error / Blocker Banner */}
        {error && (
          <section className="bg-rose-950/30 border border-rose-500/40 rounded-2xl p-6 text-rose-200 space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-rose-300">{error.title}</h3>
                <p className="text-sm text-rose-200/90">{error.message}</p>
              </div>
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

        {/* Pipeline Results View */}
        {data && (
          <div className="space-y-8">
            {/* Top Summary Bar */}
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

            {/* Generated Research Answer */}
            <section className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  Synthesized Research Answer
                </h2>
                <span className="text-xs font-mono text-slate-500">
                  Model: {data.metadata.modelId} ({data.metadata.durationMs}ms)
                </span>
              </div>
              <div className="text-sm leading-relaxed text-slate-200 whitespace-pre-line">
                {data.answer}
              </div>
            </section>

            {/* CENTERPIECE: Claim Verification Table */}
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
                <div className="text-xs font-mono bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-400 self-start sm:self-center">
                  Gating: Provenance verified in code before semantic certification
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase tracking-wider bg-slate-900/50">
                      <th className="py-3 px-4 w-[28%]">Claim</th>
                      <th className="py-3 px-3 w-[16%]">Code Provenance</th>
                      <th className="py-3 px-3 w-[16%]">Semantic Verdict</th>
                      <th className="py-3 px-4 w-[40%]">Evidence Quote &amp; Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {data.claims.map((claim: VerifiedClaim, idx: number) => (
                      <tr key={claim.id || idx} className="hover:bg-slate-800/30 transition-colors">
                        {/* Claim Text */}
                        <td className="py-4 px-4 align-top">
                          <span className="font-semibold text-slate-200 text-sm leading-snug block">
                            {claim.claimText}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500 mt-1 block">
                            ID: {claim.id}
                          </span>
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
                                Not Found
                              </span>
                              <p className="text-[11px] text-slate-400 leading-tight">
                                {claim.provenance.details}
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
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Retrieved Sources & Limitations Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Retrieved Sources */}
              <section className="lg:col-span-2 bg-[#0f172a] border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Search className="w-4 h-4 text-indigo-400" />
                  Retrieved Research Sources ({data.sources.length})
                </h3>
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
                      <div className="text-[11px] font-mono text-slate-500 truncate pt-1">
                        {src.url}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Research Limitations & Provenance Notes */}
              <section className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-400" />
                  Audit Notes &amp; Limitations
                </h3>
                <div className="text-xs text-slate-300 leading-relaxed space-y-3">
                  <div className="bg-[#090d16] p-3 rounded-xl border border-slate-800/80">
                    <p className="font-semibold text-slate-200 mb-1">Retrieval Scope:</p>
                    <p className="text-slate-400">
                      Tavily Search API retrieved top {data.sources.length} sources with full page content for verbatim quote auditing.
                    </p>
                  </div>
                  {data.limitations && (
                    <div className="bg-[#090d16] p-3 rounded-xl border border-slate-800/80">
                      <p className="font-semibold text-slate-200 mb-1">Model Identified Gaps:</p>
                      <p className="text-slate-400">{data.limitations}</p>
                    </div>
                  )}
                  <div className="bg-[#090d16] p-3 rounded-xl border border-slate-800/80">
                    <p className="font-semibold text-slate-200 mb-1">Provenance Gating Rule:</p>
                    <p className="text-slate-400">
                      Any candidate quote not found verbatim or normalized in retrieved source text is classified as <span className="text-slate-200 font-mono">Unverified</span> and rejected from model certification.
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
          <span>FlowPilot Verify — NVIDIA Hackathon 2026 Submission</span>
          <span>NVIDIA Nemotron-3.5-Lightning on Nebius Token Factory &bull; Tavily Search API</span>
        </div>
      </footer>
    </div>
  );
}

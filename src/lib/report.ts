import { ResearchApiResponse } from './schema';

/**
 * Generates a clean, comprehensive GitHub Flavored Markdown report
 * documenting the complete research findings, claim verification table,
 * verbatim evidence quotes, provenance audit results, and limitations.
 */
export function generateMarkdownReport(data: ResearchApiResponse): string {
  const { question, answer, sources, claims, summary, limitations, metadata, plan, findingsSummary } = data;

  const lines: string[] = [];

  lines.push('# FlowPilot Verify — Research & Provenance Audit Report');
  lines.push('');
  lines.push('> **Tagline:** *Code verifies provenance. Nemotron evaluates meaning.*');
  lines.push('');
  lines.push(`- **Generated:** ${metadata?.completedAt || new Date().toISOString()}`);
  lines.push(`- **Model Evaluator:** \`${metadata?.modelId || 'nvidia/Nemotron-3_5-Lightning'}\``);
  lines.push(`- **Pipeline Duration:** ${metadata?.durationMs || 0} ms`);
  lines.push(`- **Provenance Pass Rate:** ${summary.provenancePassRate}% (${summary.totalClaims - summary.unverifiedCount}/${summary.totalClaims} claims verified in source)`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Research Question');
  lines.push('');
  lines.push(`**${question}**`);
  lines.push('');

  if (plan) {
    lines.push('## Nemotron Research Plan');
    lines.push('');
    if (plan.focusAreas && plan.focusAreas.length > 0) {
      lines.push('### Focus Areas');
      plan.focusAreas.forEach((area) => lines.push(`- ${area}`));
      lines.push('');
    }
    if (plan.searchQueries && plan.searchQueries.length > 0) {
      lines.push('### Search Queries Formulated');
      plan.searchQueries.forEach((q) => lines.push(`- \`${q}\``));
      lines.push('');
    }
    if (plan.methodologyNotes) {
      lines.push(`*Methodology Notes:* ${plan.methodologyNotes}`);
      lines.push('');
    }
    lines.push('---');
    lines.push('');
  }

  lines.push('## Synthesized Research Answer');
  lines.push('');
  lines.push(answer);
  lines.push('');

  if (findingsSummary) {
    lines.push('## Verification Findings Summary');
    lines.push('');
    lines.push(findingsSummary);
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('## Claim-Verification Audit Table');
  lines.push('');
  lines.push('| # | Claim | Code Provenance | Semantic Verdict | Confidence | Source URL |');
  lines.push('|---|---|---|---|---|---|');

  claims.forEach((c, idx) => {
    const provBadge = c.provenance.isValid
      ? `PASS (${c.provenance.matchType})`
      : 'FAILED (Unverified)';
    const verdictBadge = c.verdict;
    const conf = c.verdict === 'Unverified' ? 'N/A' : `${c.confidence}%`;
    const cleanClaim = c.claimText.replace(/\|/g, '\\|');
    lines.push(`| ${idx + 1} | ${cleanClaim} | ${provBadge} | **${verdictBadge}** | ${conf} | [Link](${c.sourceUrl}) |`);
  });

  lines.push('');
  lines.push('### Detailed Evidence Excerpts & Reasoning');
  lines.push('');

  claims.forEach((c, idx) => {
    lines.push(`#### Claim ${idx + 1}: "${c.claimText}"`);
    lines.push(`- **Verdict:** \`${c.verdict}\` (Confidence: ${c.verdict === 'Unverified' ? 'N/A' : `${c.confidence}%`})`);
    lines.push(`- **Provenance Check:** ${c.provenance.details}`);
    lines.push(`- **Reasoning / Explanation:** ${c.verdictExplanation}`);
    lines.push(`- **Source:** [${c.sourceUrl}](${c.sourceUrl})`);
    lines.push('- **Verbatim Evidence Quote:**');
    lines.push('  > ' + c.candidateQuote.replace(/\n/g, '\n  > '));
    lines.push('');
  });

  lines.push('---');
  lines.push('');
  lines.push(`## Retrieved Web Sources (${sources.length})`);
  lines.push('');

  sources.forEach((s, idx) => {
    lines.push(`### [${idx + 1}] ${s.title}`);
    lines.push(`- **URL:** [${s.url}](${s.url})`);
    lines.push(`- **Excerpt:** ${s.snippet}`);
    lines.push('');
  });

  lines.push('---');
  lines.push('');
  lines.push('## Audit Notes & Limitations');
  lines.push('');
  if (limitations) {
    lines.push(`- **Identified Evidence Limitations:** ${limitations}`);
  }
  lines.push('- **Deterministic Provenance Rule:** Unverified quotes are gated in code prior to semantic evaluation and cannot be certified by the model.');
  lines.push('- **Untrusted Web Retrieval:** All retrieved content is treated as untrusted text.');
  lines.push('');

  return lines.join('\n');
}

/**
 * Generates an indented JSON string representation of the full research response.
 */
export function generateJsonReport(data: ResearchApiResponse): string {
  return JSON.stringify(data, null, 2);
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMarkdownReport, generateJsonReport } from '../src/lib/report';
import { ResearchApiResponse } from '../src/lib/schema';

const sampleResponse: ResearchApiResponse = {
  question: 'What is NVIDIA Nemotron-3.5-Lightning latency profile?',
  plan: {
    searchQueries: ['NVIDIA Nemotron-3.5-Lightning latency benchmarks', 'Nemotron Mamba inference throughput'],
    focusAreas: ['Latency benchmarks', 'Tokens per second', 'Memory consumption'],
    methodologyNotes: 'Empirical whitepapers only.',
  },
  answer: 'NVIDIA Nemotron-3.5-Lightning delivers sub-10ms first-token latency in optimized TensorRT-LLM runtimes.',
  findingsSummary: 'Out of 2 extracted claims, 2 passed deterministic quote provenance (100% provenance rate). 1 claim is semantically Supported by verbatim evidence. 1 claim has Insufficient Evidence.',
  sources: [
    {
      title: 'NVIDIA Official Architecture Guide',
      url: 'https://developer.nvidia.com/nemotron-latency',
      snippet: 'Sub-10ms first-token latency is achieved with hybrid architecture.',
      content: 'Sub-10ms first-token latency is achieved with hybrid architecture on modern Blackwell and Hopper platforms.',
    },
  ],
  claims: [
    {
      id: 'claim-1',
      claimText: 'Nemotron achieves sub-10ms first-token latency.',
      candidateQuote: 'Sub-10ms first-token latency is achieved with hybrid architecture',
      sourceUrl: 'https://developer.nvidia.com/nemotron-latency',
      provenance: {
        isValid: true,
        matchType: 'EXACT',
        sourceUrlValid: true,
        details: 'Verbatim quote matched in source.',
      },
      verdict: 'Supported',
      verdictExplanation: 'The whitepaper states sub-10ms first-token latency is achieved.',
      confidence: 95,
    },
    {
      id: 'claim-2',
      claimText: 'Nemotron uses zero memory.',
      candidateQuote: 'memory consumption is zero',
      sourceUrl: 'https://developer.nvidia.com/nemotron-latency',
      provenance: {
        isValid: false,
        matchType: 'NOT_FOUND',
        sourceUrlValid: true,
        details: 'Quote not found in source text.',
      },
      verdict: 'Unverified',
      verdictExplanation: 'Provenance failed: quote was not found. Cannot certify uncorroborated quote.',
      confidence: 0,
    },
  ],
  summary: {
    totalClaims: 2,
    supportedCount: 1,
    contradictedCount: 0,
    insufficientCount: 0,
    unverifiedCount: 1,
    provenancePassRate: 50,
  },
  limitations: 'Benchmarks measured on FP8 precision; INT4 metrics pending.',
  metadata: {
    modelId: 'nvidia/Nemotron-3_5-Lightning',
    nebiusBaseUrl: 'https://api.tokenfactory.eu-north1.nebius.com/v1/',
    durationMs: 4120,
    completedAt: '2026-10-30T12:00:00.000Z',
  },
};

test('generateMarkdownReport produces comprehensive report with table, quotes, and metadata', () => {
  const md = generateMarkdownReport(sampleResponse);

  // Check critical sections
  assert.match(md, /# FlowPilot Verify — Research & Provenance Audit Report/);
  assert.match(md, /nvidia\/Nemotron-3_5-Lightning/);
  assert.match(md, /50% \(1\/2 claims verified in source\)/);
  assert.match(md, /## Research Question/);
  assert.match(md, /What is NVIDIA Nemotron-3.5-Lightning latency profile\?/);
  assert.match(md, /## Nemotron Research Plan/);
  assert.match(md, /Sub-10ms first-token latency/);
  assert.match(md, /## Claim-Verification Audit Table/);
  assert.match(md, /PASS \(EXACT\)/);
  assert.match(md, /FAILED \(Unverified\)/);
  assert.match(md, /Supported/);
  assert.match(md, /Unverified/);
  assert.match(md, /## Audit Notes & Limitations/);
  assert.match(md, /FP8 precision/);
});

test('generateJsonReport produces valid parseable JSON matching original data', () => {
  const jsonStr = generateJsonReport(sampleResponse);
  const parsed = JSON.parse(jsonStr);

  assert.equal(parsed.question, sampleResponse.question);
  assert.equal(parsed.summary.totalClaims, 2);
  assert.equal(parsed.claims[0].verdict, 'Supported');
  assert.equal(parsed.claims[1].verdict, 'Unverified');
  assert.equal(parsed.metadata.modelId, 'nvidia/Nemotron-3_5-Lightning');
});

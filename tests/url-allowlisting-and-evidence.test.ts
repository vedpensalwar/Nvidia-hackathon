import test from 'node:test';
import assert from 'node:assert/strict';
import { isUrlAllowlisted, checkQuoteProvenance } from '../src/lib/provenance';
import { ResearchSource, VerifiedClaim } from '../src/lib/schema';
import { computeFindingsSummary } from '../src/lib/nebius';

const mockSources: ResearchSource[] = [
  {
    title: 'NVIDIA Official Architecture Documentation',
    url: 'https://docs.nvidia.com/nemotron-3.5/',
    snippet: 'Nemotron-3.5-Lightning provides 4x inference throughput compared to previous generation.',
    content: 'Full documentation: Nemotron-3.5-Lightning provides 4x inference throughput compared to previous generation on NVIDIA HGX systems.',
  },
  {
    title: 'Independent Benchmark Analysis',
    url: 'https://benchmarks.ai/analysis-2026',
    snippet: 'Independent evaluation confirms power consumption is 700W peak per card.',
    content: 'Our lab tested the cluster: Independent evaluation confirms power consumption is 700W peak per card under heavy matrix multiplication.',
  },
];

test('isUrlAllowlisted approves exact and canonicalized URLs in source list', () => {
  // Exact match
  const res1 = isUrlAllowlisted('https://docs.nvidia.com/nemotron-3.5/', mockSources);
  assert.equal(res1.isAllowed, true);
  assert.equal(res1.matchedSource?.title, 'NVIDIA Official Architecture Documentation');

  // Trailing slash difference
  const res2 = isUrlAllowlisted('https://docs.nvidia.com/nemotron-3.5', mockSources);
  assert.equal(res2.isAllowed, true);

  // Protocol difference and lowercase
  const res3 = isUrlAllowlisted('http://DOCS.NVIDIA.COM/nemotron-3.5/', mockSources);
  assert.equal(res3.isAllowed, true);

  // URL with query parameter or fragment
  const res4 = isUrlAllowlisted('https://benchmarks.ai/analysis-2026?section=power#results', mockSources);
  assert.equal(res4.isAllowed, true);
});

test('isUrlAllowlisted rejects hallucinated or unretrieved URLs', () => {
  const fake1 = isUrlAllowlisted('https://hallucinated-source.com/page', mockSources);
  assert.equal(fake1.isAllowed, false);
  assert.equal(fake1.matchedSource, null);

  const fake2 = isUrlAllowlisted('', mockSources);
  assert.equal(fake2.isAllowed, false);
});

test('checkQuoteProvenance rejects fabricated evidence not in source', () => {
  const fabricatedQuote = 'Nemotron was invented by alien civilizations in ancient Egypt.';
  const result = checkQuoteProvenance(
    fabricatedQuote,
    'https://docs.nvidia.com/nemotron-3.5/',
    mockSources
  );

  assert.equal(result.isValid, false);
  assert.equal(result.matchType, 'NOT_FOUND');
  assert.equal(result.sourceUrlValid, true);
  assert.match(result.details, /Evidence quote was not found/);
});

test('checkQuoteProvenance flags quote found in different source than cited URL', () => {
  // Quote is from source 2 (benchmarks.ai), but cited under source 1 (docs.nvidia.com)
  const quoteFromSource2 = 'power consumption is 700W peak per card';
  const result = checkQuoteProvenance(
    quoteFromSource2,
    'https://docs.nvidia.com/nemotron-3.5/',
    mockSources
  );

  assert.equal(result.isValid, false);
  assert.equal(result.sourceUrlValid, false);
  assert.match(result.details, /Quote appeared in a different source/);
});

test('computeFindingsSummary handles Supported, Contradicted, Insufficient, and Unverified verdicts', () => {
  const claims: VerifiedClaim[] = [
    {
      id: 'c-1',
      claimText: 'Throughput is 4x faster.',
      candidateQuote: '4x inference throughput compared to previous generation',
      sourceUrl: 'https://docs.nvidia.com/nemotron-3.5/',
      provenance: { isValid: true, matchType: 'EXACT', sourceUrlValid: true, details: 'OK' },
      verdict: 'Supported',
      verdictExplanation: 'Direct match.',
      confidence: 98,
    },
    {
      id: 'c-2',
      claimText: 'Power consumption is 10W.',
      candidateQuote: 'power consumption is 700W peak per card',
      sourceUrl: 'https://benchmarks.ai/analysis-2026',
      provenance: { isValid: true, matchType: 'EXACT', sourceUrlValid: true, details: 'OK' },
      verdict: 'Contradicted',
      verdictExplanation: 'Source says 700W, contradicting 10W.',
      confidence: 95,
    },
    {
      id: 'c-3',
      claimText: 'Cluster pricing starts at $100.',
      candidateQuote: 'Independent evaluation confirms power consumption',
      sourceUrl: 'https://benchmarks.ai/analysis-2026',
      provenance: { isValid: true, matchType: 'EXACT', sourceUrlValid: true, details: 'OK' },
      verdict: 'Insufficient Evidence',
      verdictExplanation: 'Source does not mention pricing.',
      confidence: 60,
    },
    {
      id: 'c-4',
      claimText: 'Ships with quantum teleportation module.',
      candidateQuote: 'quantum teleportation module',
      sourceUrl: 'https://docs.nvidia.com/nemotron-3.5/',
      provenance: { isValid: false, matchType: 'NOT_FOUND', sourceUrlValid: true, details: 'Not found' },
      verdict: 'Unverified',
      verdictExplanation: 'Provenance failed. Cannot certify.',
      confidence: 0,
    },
  ];

  const summary = computeFindingsSummary('Synthesis answer text', claims);

  assert.match(summary, /Out of 4 extracted claims, 3 passed deterministic quote provenance \(75% provenance rate\)/);
  assert.match(summary, /1 claim is semantically Supported/);
  assert.match(summary, /1 claim is Contradicted/);
  assert.match(summary, /1 claim has Insufficient Evidence/);
  assert.match(summary, /1 claim failed provenance.*strictly gated as Unverified/);
});

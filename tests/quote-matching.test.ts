import test from 'node:test';
import assert from 'node:assert/strict';
import { checkQuoteProvenance, normalizeForMatching, normalizeUrl } from '../src/lib/provenance';
import { ResearchSource } from '../src/lib/schema';

test('normalizeForMatching handles Unicode, smart quotes, dashes, and whitespace', () => {
  const input = '“Nemotron-3.5—Lightning” delivers\n\tup to 10×\u00A0speedup with ‘zero’ overhead.';
  const expected = '"nemotron-3.5-lightning" delivers up to 10× speedup with \'zero\' overhead.';
  assert.equal(normalizeForMatching(input), expected);
});

test('normalizeUrl normalizes variations of URLs', () => {
  assert.equal(normalizeUrl('https://www.nvidia.com/en-us/ai/'), 'nvidia.com/en-us/ai');
  assert.equal(normalizeUrl('http://nvidia.com/en-us/ai'), 'nvidia.com/en-us/ai');
  assert.equal(normalizeUrl('nvidia.com/en-us/ai/'), 'nvidia.com/en-us/ai');
});

test('checkQuoteProvenance finds exact verbatim quote in source', () => {
  const sources: ResearchSource[] = [
    {
      title: 'NVIDIA Technical Blog',
      url: 'https://developer.nvidia.com/blog/nemotron',
      snippet: 'NVIDIA Nemotron-3.5-Lightning provides high-throughput inference for agentic workflows.',
      content: 'In our testing, NVIDIA Nemotron-3.5-Lightning provides high-throughput inference for agentic workflows with low latency.',
    },
  ];

  const result = checkQuoteProvenance(
    'NVIDIA Nemotron-3.5-Lightning provides high-throughput inference',
    'https://developer.nvidia.com/blog/nemotron',
    sources
  );

  assert.equal(result.isValid, true);
  assert.equal(result.matchType, 'EXACT');
  assert.equal(result.sourceUrlValid, true);
});

test('checkQuoteProvenance handles smart quotes and line break normalization', () => {
  const sources: ResearchSource[] = [
    {
      title: 'Nebius Token Factory Guide',
      url: 'https://docs.nebius.com/tokenfactory',
      snippet: 'Nebius hosts “Nemotron-3.5-Lightning” with OpenAI-compatible endpoints.',
      content: 'Nebius hosts “Nemotron-3.5-Lightning”\nwith OpenAI-compatible endpoints for high availability.',
    },
  ];

  // User/model candidate quote with straight quotes and single space
  const candidate = 'Nebius hosts "Nemotron-3.5-Lightning" with OpenAI-compatible endpoints';
  const result = checkQuoteProvenance(
    candidate,
    'https://docs.nebius.com/tokenfactory/',
    sources
  );

  assert.equal(result.isValid, true);
  assert.equal(result.matchType, 'NORMALIZED');
  assert.equal(result.sourceUrlValid, true);
});

test('checkQuoteProvenance rejects quote when URL is not in retrieved sources', () => {
  const sources: ResearchSource[] = [
    {
      title: 'Source A',
      url: 'https://example.com/a',
      snippet: 'Some legitimate facts here.',
      content: 'Full body content.',
    },
  ];

  const result = checkQuoteProvenance(
    'Some legitimate facts here',
    'https://hallucinated-site.org/fake',
    sources
  );

  assert.equal(result.isValid, false);
  assert.equal(result.sourceUrlValid, false);
  assert.match(result.details, /does not match any of the 1 retrieved/i);
});

test('checkQuoteProvenance rejects quote when quote does not appear in source content', () => {
  const sources: ResearchSource[] = [
    {
      title: 'Verified Article',
      url: 'https://example.com/article',
      snippet: 'Solar power capacity grew 25% in 2025 across Europe.',
      content: 'Detailed report on European renewable energy infrastructure.',
    },
  ];

  const result = checkQuoteProvenance(
    'Solar power generated 99% of global energy in 1990',
    'https://example.com/article',
    sources
  );

  assert.equal(result.isValid, false);
  assert.equal(result.matchType, 'NOT_FOUND');
  assert.equal(result.sourceUrlValid, true);
  assert.match(result.details, /Evidence quote was not found/i);
});

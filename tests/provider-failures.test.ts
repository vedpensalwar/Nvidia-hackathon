import test from 'node:test';
import assert from 'node:assert/strict';
import { checkServerCredentials } from '../src/lib/config';
import { fetchTavilyResearchSources } from '../src/lib/tavily';
import { callNemotron, extractAndParseJson } from '../src/lib/nebius';
import { ResearchPlanSchema } from '../src/lib/schema';

test('checkServerCredentials identifies missing API keys and provides guidance', () => {
  // Save current env
  const origNebius = process.env.NEBIUS_API_KEY;
  const origTavily = process.env.TAVILY_API_KEY;

  try {
    delete process.env.NEBIUS_API_KEY;
    delete process.env.TAVILY_API_KEY;

    const diag = checkServerCredentials();
    assert.equal(diag.isReady, false);
    assert.ok(diag.missingVariables.includes('NEBIUS_API_KEY'));
    assert.ok(diag.missingVariables.includes('TAVILY_API_KEY'));
    assert.ok(diag.instructions.some((i) => i.includes('.env.local')));
  } finally {
    if (origNebius) process.env.NEBIUS_API_KEY = origNebius;
    if (origTavily) process.env.TAVILY_API_KEY = origTavily;
  }
});

test('fetchTavilyResearchSources throws clear blocker message when API key is empty', async () => {
  await assert.rejects(
    async () => {
      await fetchTavilyResearchSources('query', '');
    },
    {
      name: 'Error',
      message: /Tavily Blocker: TAVILY_API_KEY is not configured/,
    }
  );
});

test('callNemotron throws clear blocker message when NEBIUS_API_KEY is empty', async () => {
  await assert.rejects(
    async () => {
      await callNemotron(
        {
          nebiusApiKey: '',
          nebiusBaseUrl: 'https://api.tokenfactory.eu-north1.nebius.com/v1/',
          nebiusModelId: 'nvidia/Nemotron-3_5-Lightning',
          tavilyApiKey: 'fake',
        },
        [{ role: 'user', content: 'test' }]
      );
    },
    {
      name: 'Error',
      message: /Nebius Blocker: NEBIUS_API_KEY is not configured/,
    }
  );
});

test('extractAndParseJson extracts clean JSON from markdown code blocks', () => {
  const modelOutputWithFence = `
Here is my structured answer:
\`\`\`json
{
  "answer": "This is a verified test response.",
  "claims": []
}
\`\`\`
Hope this helps!`;

  const parsed = extractAndParseJson(modelOutputWithFence, 'answer') as Record<string, unknown>;
  assert.equal(parsed.answer, 'This is a verified test response.');
});

test('extractAndParseJson extracts outermost JSON when surrounded by model thinking text', () => {
  const thinkingOutput = `
<think>
Analyzing the sources and drafting claims carefully...
</think>
{
  "searchQueries": ["nvidia nemotron latency", "nemotron architecture"],
  "focusAreas": ["throughput", "efficiency"],
  "methodologyNotes": "official docs"
}`;

  const parsed = extractAndParseJson(thinkingOutput, 'searchQueries') as Record<string, unknown>;
  assert.ok(Array.isArray(parsed.searchQueries));
  assert.equal((parsed.searchQueries as string[])[0], 'nvidia nemotron latency');
});

test('extractAndParseJson throws SyntaxError on completely non-JSON content', () => {
  const garbage = 'Sorry, as an AI I am unable to fulfill this request.';
  assert.throws(() => {
    extractAndParseJson(garbage, 'answer');
  }, SyntaxError);
});

test('ResearchPlanSchema validates structured planning output and rejects empty queries', () => {
  const valid = ResearchPlanSchema.safeParse({
    searchQueries: ['nvidia nemotron-3.5 architecture'],
    focusAreas: ['Hybrid Mamba-Transformer', 'Latency benefits'],
    methodologyNotes: 'Prioritize official NVIDIA technical whitepapers.',
  });
  assert.equal(valid.success, true);

  const invalidEmptyQueries = ResearchPlanSchema.safeParse({
    searchQueries: [],
    focusAreas: ['focus'],
  });
  assert.equal(invalidEmptyQueries.success, false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ModelDraftResponseSchema,
  ModelVerdictResponseSchema,
  ResearchRequestSchema,
} from '../src/lib/schema';

test('ResearchRequestSchema validates valid and invalid questions', () => {
  const valid = ResearchRequestSchema.safeParse({ question: 'What are NVIDIA Nemotron capabilities?' });
  assert.equal(valid.success, true);

  const tooShort = ResearchRequestSchema.safeParse({ question: 'ab' });
  assert.equal(tooShort.success, false);

  const missing = ResearchRequestSchema.safeParse({});
  assert.equal(missing.success, false);
});

test('ModelDraftResponseSchema parses valid model draft JSON', () => {
  const mockPayload = {
    answer: 'NVIDIA Nemotron-3.5-Lightning provides accelerated inference for enterprise reasoning workloads.',
    claims: [
      {
        id: 'claim-1',
        claimText: 'Nemotron-3.5-Lightning is designed for enterprise reasoning.',
        candidateQuote: 'accelerated inference for enterprise reasoning workloads',
        sourceUrl: 'https://developer.nvidia.com/nemotron',
      },
    ],
    limitations: 'Limited comparative benchmarks against other architectures.',
  };

  const parsed = ModelDraftResponseSchema.safeParse(mockPayload);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.claims.length, 1);
    assert.equal(parsed.data.claims[0].claimText, 'Nemotron-3.5-Lightning is designed for enterprise reasoning.');
  }
});

test('ModelDraftResponseSchema rejects empty claims or answers', () => {
  const invalidPayload = {
    answer: 'Too short',
    claims: [],
  };

  const parsed = ModelDraftResponseSchema.safeParse(invalidPayload);
  assert.equal(parsed.success, false);
});

test('ModelVerdictResponseSchema validates structured semantic verdicts', () => {
  const validVerdicts = {
    verdicts: [
      {
        claimId: 'claim-1',
        verdict: 'Supported',
        confidence: 95,
        explanation: 'Evidence quote directly corroborates the assertion.',
      },
      {
        claimId: 'claim-2',
        verdict: 'Contradicted',
        confidence: 88,
        explanation: 'Evidence indicates 5x speedup, directly contradicting the claimed 20x.',
      },
      {
        claimId: 'claim-3',
        verdict: 'Insufficient Evidence',
        confidence: 60,
        explanation: 'The quote mentions pricing but does not specify licensing terms.',
      },
    ],
  };

  const parsed = ModelVerdictResponseSchema.safeParse(validVerdicts);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.verdicts.length, 3);
    assert.equal(parsed.data.verdicts[0].verdict, 'Supported');
    assert.equal(parsed.data.verdicts[1].verdict, 'Contradicted');
    assert.equal(parsed.data.verdicts[2].verdict, 'Insufficient Evidence');
  }
});

test('ModelVerdictResponseSchema rejects unallowed verdict strings', () => {
  const invalidVerdict = {
    verdicts: [
      {
        claimId: 'claim-1',
        verdict: 'CompletelyTrue', // Not in enum
        confidence: 90,
        explanation: 'Some explanation',
      },
    ],
  };

  const parsed = ModelVerdictResponseSchema.safeParse(invalidVerdict);
  assert.equal(parsed.success, false);
});

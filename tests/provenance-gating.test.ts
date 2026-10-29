import test from 'node:test';
import assert from 'node:assert/strict';
import { checkQuoteProvenance } from '../src/lib/provenance';
import { ResearchSource, VerifiedClaim } from '../src/lib/schema';

test('Provenance Gating Workflow prevents unverified quotes from receiving model certification', () => {
  const sources: ResearchSource[] = [
    {
      title: 'NVIDIA Official Architecture Whitepaper',
      url: 'https://nvidia.com/whitepaper/nemotron',
      snippet: 'Nemotron-3.5-Lightning features a hybrid Mamba-Transformer architecture.',
      content: 'Nemotron-3.5-Lightning features a hybrid Mamba-Transformer architecture designed for extreme inference efficiency on modern GPU clusters.',
    },
  ];

  // Raw claims from model
  const rawClaims = [
    {
      id: 'claim-1',
      claimText: 'Nemotron uses a hybrid Mamba-Transformer architecture.',
      candidateQuote: 'hybrid Mamba-Transformer architecture designed for extreme inference efficiency',
      sourceUrl: 'https://nvidia.com/whitepaper/nemotron',
    },
    {
      id: 'claim-2',
      claimText: 'Nemotron was released in 1985 on floppy disk.',
      candidateQuote: 'originally shipped on 3.5 inch floppy disks in 1985',
      sourceUrl: 'https://nvidia.com/whitepaper/nemotron',
    },
    {
      id: 'claim-3',
      claimText: 'Nemotron requires 100kW of power.',
      candidateQuote: 'requires 100kW of power per rack',
      sourceUrl: 'https://unretrieved-source.com/blog',
    },
  ];

  // Stage 1: Deterministic Provenance Evaluation
  const verifiedClaims: VerifiedClaim[] = rawClaims.map((raw) => {
    const prov = checkQuoteProvenance(raw.candidateQuote, raw.sourceUrl, sources);
    return {
      id: raw.id,
      claimText: raw.claimText,
      candidateQuote: raw.candidateQuote,
      sourceUrl: raw.sourceUrl,
      provenance: {
        isValid: prov.isValid,
        matchType: prov.matchType,
        sourceUrlValid: prov.sourceUrlValid,
        details: prov.details,
      },
      verdict: prov.isValid ? 'Insufficient Evidence' : 'Unverified',
      verdictExplanation: prov.isValid
        ? 'Awaiting semantic certification.'
        : `Provenance failed: ${prov.details}. Gated from semantic certification.`,
      confidence: 0,
    };
  });

  // Verify Claim 1 passed provenance
  assert.equal(verifiedClaims[0].provenance.isValid, true);
  assert.equal(verifiedClaims[0].provenance.matchType, 'EXACT');

  // Verify Claim 2 failed (quote not found)
  assert.equal(verifiedClaims[1].provenance.isValid, false);
  assert.equal(verifiedClaims[1].verdict, 'Unverified');
  assert.match(verifiedClaims[1].verdictExplanation, /Provenance failed/);

  // Verify Claim 3 failed (URL mismatch)
  assert.equal(verifiedClaims[2].provenance.isValid, false);
  assert.equal(verifiedClaims[2].verdict, 'Unverified');
  assert.match(verifiedClaims[2].verdictExplanation, /Provenance failed/);

  // Stage 2: Filter claims eligible for semantic evaluation
  const eligibleForNemotron = verifiedClaims.filter((c) => c.provenance.isValid);
  assert.equal(eligibleForNemotron.length, 1);
  assert.equal(eligibleForNemotron[0].id, 'claim-1');

  // Mocked Nemotron semantic evaluation on eligible claim only
  const mockNemotronVerdicts = [
    {
      claimId: 'claim-1',
      verdict: 'Supported' as const,
      confidence: 96,
      explanation: 'The verified whitepaper quote explicitly states it features a hybrid Mamba-Transformer architecture.',
    },
  ];

  // Apply verdicts
  for (const c of verifiedClaims) {
    if (c.provenance.isValid) {
      const match = mockNemotronVerdicts.find((m) => m.claimId === c.id);
      if (match) {
        c.verdict = match.verdict;
        c.verdictExplanation = match.explanation;
        c.confidence = match.confidence;
      }
    }
  }

  // Final Assertions:
  // Claim 1 is certified as Supported
  assert.equal(verifiedClaims[0].verdict, 'Supported');
  assert.equal(verifiedClaims[0].confidence, 96);

  // Claims 2 and 3 remain Unverified, never certified
  assert.equal(verifiedClaims[1].verdict, 'Unverified');
  assert.equal(verifiedClaims[2].verdict, 'Unverified');
});

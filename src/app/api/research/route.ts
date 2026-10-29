import { NextRequest, NextResponse } from 'next/server';
import {
  ResearchRequestSchema,
  ResearchApiResponse,
  VerifiedClaim,
} from '@/lib/schema';
import { checkServerCredentials, getServerConfig } from '@/lib/config';
import { fetchTavilyResearchSources } from '@/lib/tavily';
import { draftAnswerAndClaims, evaluateClaimSemantics } from '@/lib/nebius';
import { checkQuoteProvenance } from '@/lib/provenance';

export const maxDuration = 60; // Up to 60 seconds for serverless functions on Vercel Pro/Hobby
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Validate request body
    const body = await req.json();
    const parsedRequest = ResearchRequestSchema.safeParse(body);

    if (!parsedRequest.success) {
      return NextResponse.json(
        {
          error: 'Validation Error',
          message: parsedRequest.error.issues.map((i) => i.message).join(', '),
        },
        { status: 400 }
      );
    }

    const { question } = parsedRequest.data;

    // 2. Validate Server Environment Credentials
    const credentials = checkServerCredentials();
    if (!credentials.isReady) {
      return NextResponse.json(
        {
          error: 'Missing Server Credentials',
          message: `The server is missing required API keys: ${credentials.missingVariables.join(', ')}.`,
          instructions: credentials.instructions,
          missingVariables: credentials.missingVariables,
        },
        { status: 503 }
      );
    }

    const config = getServerConfig();

    // 3. Retrieve up to 3 web sources from Tavily
    const sources = await fetchTavilyResearchSources(question, config.tavilyApiKey, 3);

    if (sources.length === 0) {
      return NextResponse.json(
        {
          error: 'Retrieval Failure',
          message: 'Tavily search returned zero sources for this question. Try rephrasing your research query.',
        },
        { status: 422 }
      );
    }

    // 4. Draft answer and extract up to 6 discrete claims using NVIDIA Nemotron-3.5-Lightning
    const draftResponse = await draftAnswerAndClaims(question, sources, config);

    // 5. Deterministic Code Provenance Checks
    // Code verifies provenance. If provenance fails, claim is UNVERIFIED and gated from semantic certification.
    const initialClaims: VerifiedClaim[] = draftResponse.claims.map((rawClaim, idx) => {
      const claimId = rawClaim.id || `claim-${idx + 1}`;
      const provenanceResult = checkQuoteProvenance(
        rawClaim.candidateQuote,
        rawClaim.sourceUrl,
        sources
      );

      return {
        id: claimId,
        claimText: rawClaim.claimText,
        candidateQuote: rawClaim.candidateQuote,
        sourceUrl: rawClaim.sourceUrl,
        provenance: {
          isValid: provenanceResult.isValid,
          matchType: provenanceResult.matchType,
          sourceUrlValid: provenanceResult.sourceUrlValid,
          details: provenanceResult.details,
        },
        // If provenance check fails, classify as Unverified immediately
        verdict: provenanceResult.isValid ? 'Insufficient Evidence' : 'Unverified',
        verdictExplanation: provenanceResult.isValid
          ? 'Provenance validated. Awaiting semantic evaluation.'
          : `Provenance check failed: ${provenanceResult.details}. Cannot certify uncorroborated quote.`,
        confidence: provenanceResult.isValid ? 0 : 0,
      };
    });

    // 6. Filter claims that passed provenance for semantic evaluation
    const claimsPassingProvenance = initialClaims.filter((c) => c.provenance.isValid);

    // 7. Nemotron evaluates meaning for proven claims
    if (claimsPassingProvenance.length > 0) {
      const semanticVerdicts = await evaluateClaimSemantics(
        claimsPassingProvenance,
        sources,
        config
      );

      const verdictMap = new Map(
        semanticVerdicts.verdicts.map((v) => [v.claimId, v])
      );

      for (const claim of initialClaims) {
        if (claim.provenance.isValid) {
          const evalResult = verdictMap.get(claim.id);
          if (evalResult) {
            claim.verdict = evalResult.verdict;
            claim.verdictExplanation = evalResult.explanation;
            claim.confidence = evalResult.confidence;
          } else {
            claim.verdict = 'Insufficient Evidence';
            claim.verdictExplanation = 'Model did not return a definitive verdict for this claim.';
            claim.confidence = 50;
          }
        }
      }
    }

    // 8. Compute Summary Metrics
    let supportedCount = 0;
    let contradictedCount = 0;
    let insufficientCount = 0;
    let unverifiedCount = 0;

    for (const c of initialClaims) {
      if (c.verdict === 'Supported') supportedCount++;
      else if (c.verdict === 'Contradicted') contradictedCount++;
      else if (c.verdict === 'Insufficient Evidence') insufficientCount++;
      else if (c.verdict === 'Unverified') unverifiedCount++;
    }

    const totalClaims = initialClaims.length;
    const provenancePassCount = initialClaims.filter((c) => c.provenance.isValid).length;
    const provenancePassRate = totalClaims > 0 ? Math.round((provenancePassCount / totalClaims) * 100) : 0;

    const responsePayload: ResearchApiResponse = {
      question,
      answer: draftResponse.answer,
      sources,
      claims: initialClaims,
      summary: {
        totalClaims,
        supportedCount,
        contradictedCount,
        insufficientCount,
        unverifiedCount,
        provenancePassRate,
      },
      limitations: draftResponse.limitations || '',
      metadata: {
        modelId: config.nebiusModelId,
        nebiusBaseUrl: config.nebiusBaseUrl,
        durationMs: Date.now() - startTime,
        completedAt: new Date().toISOString(),
      },
    };

    return NextResponse.json(responsePayload);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        error: 'Pipeline Error',
        message: errorMsg,
        durationMs: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

import {
  ModelDraftResponse,
  ModelDraftResponseSchema,
  ModelVerdictResponse,
  ModelVerdictResponseSchema,
  ResearchSource,
  VerifiedClaim,
} from './schema';
import { ServerConfig } from './config';

/**
 * Low-level chat completion caller for Nebius Token Factory OpenAI-compatible API
 */
export async function callNemotron(
  config: ServerConfig,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  temperature: number = 0.2,
  maxTokens: number = 2048,
  jsonMode: boolean = true
): Promise<string> {
  const { nebiusApiKey, nebiusBaseUrl, nebiusModelId } = config;

  if (!nebiusApiKey || nebiusApiKey.trim() === '') {
    throw new Error(
      'Nebius Blocker: NEBIUS_API_KEY is not configured on the server. Please add NEBIUS_API_KEY to your .env.local file or Vercel Environment Variables.'
    );
  }

  const endpoint = `${nebiusBaseUrl.replace(/\/+$/, '')}/chat/completions`;

  const payload: Record<string, unknown> = {
    model: nebiusModelId,
    messages,
    temperature,
    max_tokens: maxTokens,
  };

  if (jsonMode) {
    payload.response_format = { type: 'json_object' };
  }

  let response: Response;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s safety timeout

    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${nebiusApiKey.trim()}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Nebius Timeout Blocker: Request to ${endpoint} timed out after 45 seconds.`);
    }
    throw new Error(`Nebius Connection Blocker: Failed to reach Nebius endpoint at ${endpoint}: ${msg}`);
  }

  if (!response.ok) {
    let errorText = '';
    try {
      errorText = await response.text();
    } catch {
      errorText = response.statusText;
    }

    if (response.status === 401) {
      throw new Error(
        `Nebius Authentication Blocker (HTTP 401 Unauthorized): Nebius rejected NEBIUS_API_KEY at ${endpoint}. Check your Token Factory API key. Details: ${errorText}`
      );
    }

    if (response.status === 404) {
      throw new Error(
        `Nebius Model Blocker (HTTP 404 Not Found): Model "${nebiusModelId}" not found on ${nebiusBaseUrl}. Verify NEBIUS_MODEL_ID. Details: ${errorText}`
      );
    }

    if (response.status === 429) {
      throw new Error(
        `Nebius Rate Limit Blocker (HTTP 429 Too Many Requests): Token Factory quota exceeded. Details: ${errorText}`
      );
    }

    throw new Error(
      `Nebius API Blocker (HTTP ${response.status} ${response.statusText}): ${errorText}`
    );
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (typeof content !== 'string' || content.trim() === '') {
    throw new Error(
      `Nebius Model Blocker: Empty response received from model ${nebiusModelId}. Response body: ${JSON.stringify(data)}`
    );
  }

  return content;
}

/**
 * Extracts and parses JSON from raw model string
 */
function extractAndParseJson(raw: string): unknown {
  let cleaned = raw.trim();
  // Strip markdown code fences if model enclosed JSON in ```json ... ```
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }
  return JSON.parse(cleaned);
}

/**
 * Stage 1: Nemotron drafts research answer and extracts up to 6 discrete claims with candidate quotes & source URLs.
 * Validates output strictly with Zod.
 */
export async function draftAnswerAndClaims(
  question: string,
  sources: ResearchSource[],
  config: ServerConfig
): Promise<ModelDraftResponse> {
  const sourcesContext = sources
    .map(
      (s, idx) =>
        `SOURCE ${idx + 1}:
Title: ${s.title}
URL: ${s.url}
Text Content:
${s.content ? s.content.slice(0, 3000) : s.snippet}`
    )
    .join('\n\n====================\n\n');

  const systemPrompt = `You are FlowPilot Verify, powered by NVIDIA Nemotron-3.5-Lightning.
Your goal is to answer research questions based strictly on the provided web sources and extract discrete, verifiable claims.

CRITICAL INSTRUCTIONS:
1. Synthesize a comprehensive, factual answer (2-4 paragraphs) to the user's question using ONLY facts from the provided sources.
2. Extract between 2 and 6 discrete, atomic factual claims made in your answer.
3. For each claim:
   - "claimText": The specific factual statement.
   - "candidateQuote": A verbatim excerpt from the source text that directly supports this claim. This MUST be an exact quote from the text content of the source.
   - "sourceUrl": The exact URL of the source where the candidate quote appears.
4. "limitations": A short summary of any gaps, contradictory info, or missing aspects in the retrieved sources.
5. You MUST return strictly valid JSON matching this exact structure:
{
  "answer": "string",
  "claims": [
    {
      "id": "claim-1",
      "claimText": "string",
      "candidateQuote": "string",
      "sourceUrl": "string"
    }
  ],
  "limitations": "string"
}
Do not include any prose outside the JSON.`;

  const userPrompt = `Research Question: "${question}"

Retrieved Research Sources:
${sourcesContext}`;

  const rawOutput = await callNemotron(config, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  let parsedJson: unknown;
  try {
    parsedJson = extractAndParseJson(rawOutput);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Zod Validation Blocker: Nemotron output was not valid JSON: ${msg}. Raw response: ${rawOutput.slice(0, 300)}...`
    );
  }

  const parseResult = ModelDraftResponseSchema.safeParse(parsedJson);
  if (!parseResult.success) {
    throw new Error(
      `Zod Validation Blocker on Nemotron Draft Output: ${parseResult.error.message}`
    );
  }

  // Ensure up to 6 claims max
  const responseData = parseResult.data;
  responseData.claims = responseData.claims.slice(0, 6);

  return responseData;
}

/**
 * Stage 2: Nemotron evaluates semantic support for claims that passed deterministic quote provenance gating.
 * Validates output strictly with Zod.
 */
export async function evaluateClaimSemantics(
  verifiedClaims: VerifiedClaim[],
  sources: ResearchSource[],
  config: ServerConfig
): Promise<ModelVerdictResponse> {
  if (verifiedClaims.length === 0) {
    return { verdicts: [] };
  }

  const claimsPayload = verifiedClaims.map((c) => ({
    claimId: c.id,
    claimText: c.claimText,
    evidenceQuote: c.candidateQuote,
    sourceUrl: c.sourceUrl,
  }));

  const systemPrompt = `You are FlowPilot Verify's Semantic Evaluation Engine powered by NVIDIA Nemotron-3.5-Lightning.
Your role: "Code verifies provenance. Nemotron evaluates meaning."

The provided claims have already passed deterministic quote provenance verification in server code.
Now, evaluate whether the evidence quote semantically and logically supports the claim text.

For each claim, assign one of three verdicts:
- "Supported": The evidence quote logically proves or substantiates the claim text.
- "Contradicted": The evidence quote contradicts, refutes, or directly conflicts with the claim text.
- "Insufficient Evidence": The evidence quote is related, but does not provide enough factual backing to definitively verify the claim.

Assign a confidence score (0 to 100) and provide a concise, sharp explanation of why this verdict applies.

OUTPUT MUST BE VALID JSON:
{
  "verdicts": [
    {
      "claimId": "string",
      "verdict": "Supported" | "Contradicted" | "Insufficient Evidence",
      "confidence": number,
      "explanation": "string"
    }
  ]
}
No extra text or markdown.`;

  const userPrompt = `Evaluate the following claims against their verified evidence quotes:
${JSON.stringify(claimsPayload, null, 2)}`;

  const rawOutput = await callNemotron(config, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  let parsedJson: unknown;
  try {
    parsedJson = extractAndParseJson(rawOutput);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Zod Validation Blocker: Nemotron Verdicts output was not valid JSON: ${msg}. Raw response: ${rawOutput.slice(0, 300)}...`
    );
  }

  const parseResult = ModelVerdictResponseSchema.safeParse(parsedJson);
  if (!parseResult.success) {
    throw new Error(
      `Zod Validation Blocker on Nemotron Semantic Verdicts: ${parseResult.error.message}`
    );
  }

  return parseResult.data;
}

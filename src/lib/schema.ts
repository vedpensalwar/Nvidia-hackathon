import { z } from 'zod';

// Client request validation schema
export const ResearchRequestSchema = z.object({
  question: z
    .string()
    .min(3, { message: 'Research question must be at least 3 characters long.' })
    .max(500, { message: 'Research question cannot exceed 500 characters.' }),
});

export type ResearchRequest = z.infer<typeof ResearchRequestSchema>;

// Schema for Nemotron Research Plan
export const ResearchPlanSchema = z.object({
  searchQueries: z.array(z.string().min(2)).min(1).max(3),
  focusAreas: z.array(z.string().min(2)).min(1).max(5),
  methodologyNotes: z.string().optional().default(''),
});

export type ResearchPlan = z.infer<typeof ResearchPlanSchema>;

// Schema for raw model drafting response
export const ModelDraftClaimSchema = z.object({
  id: z.string().default(() => Math.random().toString(36).substring(2, 9)),
  claimText: z.string().min(5),
  candidateQuote: z.string().min(5),
  sourceUrl: z.string(),
});

export const ModelDraftResponseSchema = z.object({
  answer: z.string().min(10),
  claims: z.array(ModelDraftClaimSchema).min(1).max(6),
  limitations: z.string().optional().default(''),
});

export type ModelDraftResponse = z.infer<typeof ModelDraftResponseSchema>;

// Schema for semantic claim verdict from Nemotron
export const SemanticVerdictItemSchema = z.object({
  claimId: z.string(),
  verdict: z.enum(['Supported', 'Contradicted', 'Insufficient Evidence']),
  confidence: z.number().min(0).max(100),
  explanation: z.string().min(5),
});

export const ModelVerdictResponseSchema = z.object({
  verdicts: z.array(SemanticVerdictItemSchema),
});

export type ModelVerdictResponse = z.infer<typeof ModelVerdictResponseSchema>;

// Complete Verified Claim Data Model
export type FinalVerdict = 'Supported' | 'Contradicted' | 'Insufficient Evidence' | 'Unverified';

export interface VerifiedClaim {
  id: string;
  claimText: string;
  candidateQuote: string;
  sourceUrl: string;
  provenance: {
    isValid: boolean;
    matchType: 'EXACT' | 'NORMALIZED' | 'NOT_FOUND';
    sourceUrlValid: boolean;
    details: string;
  };
  verdict: FinalVerdict;
  verdictExplanation: string;
  confidence: number;
}

export interface ResearchSource {
  title: string;
  url: string;
  snippet: string;
  content: string;
}

export interface ResearchApiResponse {
  question: string;
  plan?: ResearchPlan;
  answer: string;
  findingsSummary?: string;
  sources: ResearchSource[];
  claims: VerifiedClaim[];
  summary: {
    totalClaims: number;
    supportedCount: number;
    contradictedCount: number;
    insufficientCount: number;
    unverifiedCount: number;
    provenancePassRate: number; // Percentage
  };
  limitations: string;
  metadata: {
    modelId: string;
    nebiusBaseUrl: string;
    durationMs: number;
    completedAt: string;
  };
}

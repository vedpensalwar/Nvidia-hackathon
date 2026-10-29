# FlowPilot Verify

> **"Code verifies provenance. Nemotron evaluates meaning."**

FlowPilot Verify is a verification-first AI research platform engineered for the **NVIDIA & Nebius Hackathon 2026**. Rather than functioning as a standard conversational chatbot that hallucinates uncorroborated citations, FlowPilot Verify couples **deterministic server-side quote provenance checks** with **NVIDIA Nemotron-3.5-Lightning** semantic reasoning to certify factual claims against live web evidence.

---

## Core Value Proposition & Architecture

```
                       [ User Research Question ]
                                   │
                                   ▼
                   [ 1. Real Tavily Search Retrieval ]
                      (Up to 3 authoritative sources
                       with full page content)
                                   │
                                   ▼
             [ 2. Nemotron Draft Synthesis & Claim Extraction ]
                  (nvidia/Nemotron-3_5-Lightning on Nebius)
                                   │
                   ┌───────────────┴───────────────┐
                   ▼                               ▼
       Candidate Claims (up to 6)       Verbatim Evidence Quotes
                   │                               │
                   └───────────────┬───────────────┘
                                   │
                                   ▼
         [ 3. Deterministic Code Quote Provenance Gating ]
            (Normalizes Unicode, smart quotes, whitespace,
             and verifies exact substring in source text)
                                   │
                ┌──────────────────┴──────────────────┐
                │                                     │
           [ Provenance Passed ]             [ Provenance Failed ]
                │                                     │
                ▼                                     ▼
 [ 4. Nemotron Semantic Evaluation ]           [ Instant Verdict: ]
  (nvidia/Nemotron-3_5-Lightning)              "Unverified"
  Assigns:                                     (Gated from model certification;
  - Supported                                   hallucinated quote prevented)
  - Contradicted
  - Insufficient Evidence
                │
                └──────────────────┬──────────────────┘
                                   │
                                   ▼
             [ 5. Verified Claim-Verification Table ]
```

### 1. Code Verifies Provenance (Zero Hallucination)
- Deterministic server-side code normalizes whitespace, line breaks, Unicode normalization forms, typographical dashes, and smart quotes (`“”‘’`).
- Validates that the cited source URL actually exists in the retrieved Tavily sources.
- Verifies that the candidate evidence quote actually appears verbatim or normalized inside the source text content.
- **Strict Provenance Gating**: If quote provenance fails, the claim is immediately classified as `Unverified` and **never** certified by the semantic model.

### 2. Nemotron Evaluates Meaning
- For claims that pass deterministic provenance gating, `nvidia/Nemotron-3_5-Lightning` via the **Nebius Token Factory OpenAI-compatible API** evaluates whether the evidence semantically and logically supports, contradicts, or provides insufficient backing for the claim.
- All model inputs and outputs are validated with **Zod schemas**. If parsing fails, an explicit error is returned instead of inventing mock verdicts.

---

## Technology Stack

- **Framework**: Next.js 15 (App Router, React 19, TypeScript strict mode)
- **Styling**: Tailwind CSS (dark research workspace theme)
- **Validation**: Zod (strict JSON schema validation on all model inputs & outputs)
- **LLM Inference**: `nvidia/Nemotron-3_5-Lightning` hosted on Nebius Token Factory (`https://api.tokenfactory.eu-north1.nebius.com/v1/`)
- **Web Retrieval**: Tavily Search API (`https://api.tavily.com/search`)
- **Test Runner**: Node Native Test Runner via `tsx`
- **Deployment Target**: Vercel

---

## Configuration & Environment Variables

Create a `.env.local` file in the root directory (this file is ignored by `.gitignore`):

```bash
# 1. Nebius Token Factory API Key (Required for Nemotron inference)
NEBIUS_API_KEY=your_nebius_api_key_here

# 2. Nebius OpenAI-compatible Base URL
NEBIUS_BASE_URL=https://api.tokenfactory.eu-north1.nebius.com/v1/

# 3. NVIDIA Nemotron Model Identifier
NEBIUS_MODEL_ID=nvidia/Nemotron-3_5-Lightning

# 4. Tavily Search API Key (Required for live web research retrieval)
TAVILY_API_KEY=your_tavily_api_key_here
```

A template file [`.env.example`](.env.example) is provided in the repository with placeholders only.

---

## Local Development & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Automated Test Suite
FlowPilot Verify includes automated tests for deterministic quote normalization, Zod model validation, and provenance gating:
```bash
npm test
```

### 3. Run Production Build
Verify that TypeScript and Next.js bundle without errors:
```bash
npm run build
```

### 4. Start Local Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## API Specification

### `POST /api/research`
Executes the end-to-end verification pipeline.

**Request Body:**
```json
{
  "question": "What are the latency benefits of NVIDIA Nemotron-3.5-Lightning?"
}
```

**Response Payload:**
- `question`: Original user research query.
- `answer`: Synthesized multi-paragraph answer drafted by Nemotron based strictly on retrieved sources.
- `sources`: Array of up to 3 retrieved sources with title, URL, snippet, and content.
- `claims`: Array of verified claims, each including:
  - `claimText`: Specific factual assertion.
  - `candidateQuote`: Verbatim evidence quote from the source.
  - `sourceUrl`: Clickable URL.
  - `provenance`: Object containing `isValid`, `matchType` (`EXACT` | `NORMALIZED` | `NOT_FOUND`), and `details`.
  - `verdict`: `Supported` | `Contradicted` | `Insufficient Evidence` | `Unverified`.
  - `verdictExplanation`: Concise reasoning from Nemotron or provenance gating.
  - `confidence`: Confidence score (0-100%).
- `summary`: Metrics including total claims, pass rate, and counts per verdict category.
- `limitations`: Gaps or contradictions identified in the evidence.

---

## Vercel Deployment

1. Push your repository to GitHub.
2. Import the repository in [Vercel](https://vercel.com).
3. In **Settings -> Environment Variables**, add:
   - `NEBIUS_API_KEY`
   - `NEBIUS_BASE_URL` (`https://api.tokenfactory.eu-north1.nebius.com/v1/`)
   - `NEBIUS_MODEL_ID` (`nvidia/Nemotron-3_5-Lightning`)
   - `TAVILY_API_KEY`
4. Deploy. The Next.js API routes are configured with `export const maxDuration = 60;` to accommodate multi-stage LLM and search calls.

---

## License

This project is licensed under the [MIT License](LICENSE).

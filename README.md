# FlowPilot Verify V2

> **"Code verifies provenance. Nemotron evaluates meaning."**

FlowPilot Verify is a verification-first AI research platform engineered for the **NVIDIA & Nebius Hackathon 2026**. Rather than functioning as a standard conversational chatbot that hallucinates uncorroborated citations, FlowPilot Verify enforces a deterministic two-tiered architecture: **deterministic code quote provenance gating** prevents hallucinated citations, while **NVIDIA Nemotron-3.5-Lightning** evaluates semantic meaning to certify factual claims against live web evidence.

---

## V2 End-to-End Pipeline Architecture

```
                       [ 1. User Research Question ]
                                    │
                                    ▼
                 [ 2. Nemotron Precision Research Plan ]
                  (nvidia/Nemotron-3_5-Lightning on Nebius)
                 - Formulates targeted search queries
                 - Outlines factual focus areas & methodology
                                    │
                                    ▼
                    [ 3. Tavily Live Search Retrieval ]
                  (Up to 3 authoritative web sources
                   with retained full page body text)
                                    │
                                    ▼
              [ 4. Nemotron Draft Synthesis & Claim Extraction ]
                  (nvidia/Nemotron-3_5-Lightning on Nebius)
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
        Candidate Claims (up to 6)       Verbatim Evidence Quotes
                    │                               │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
          [ 5. Deterministic Code Quote Provenance Gating ]
             (Normalizes Unicode, smart quotes, whitespace,
              validates source URL allowlist, and verifies
              exact substring in retrieved source content)
                                    │
                 ┌──────────────────┴──────────────────┐
                 │                                     │
            [ Provenance Passed ]             [ Provenance Failed ]
                 │                                     │
                 ▼                                     ▼
  [ 6. Nemotron Semantic Evaluation ]           [ Instant Verdict: ]
   (nvidia/Nemotron-3_5-Lightning)              "Unverified"
   Assigns with Zod validation:                 (Gated in code from model
   - Supported                                   certification; prevents
   - Contradicted                                hallucinated quotes)
   - Insufficient Evidence                             │
                 │                                     │
                 └──────────────────┬──────────────────┘
                                    │
                                    ▼
           [ 7. Verified Research Dossier & Export Engine ]
             - Claim-Verification Table with expandable reasoning
             - Verified Findings Summary & Audit Notes
             - Downloadable Markdown (.md) and JSON (.json) Reports
```

---

## Core Invariants

### 1. Code Verifies Provenance (Zero Hallucination)
- **Deterministic server-side code** normalizes whitespace, line breaks, Unicode normalization forms (NFKD), typographical dashes, and smart quotes (`“”‘’`).
- **Source URL Allowlisting**: Validates that cited source URLs match allowlisted retrieved sources before checking quote presence.
- **Verbatim Substring Checking**: Verifies that candidate quotes exist in the retrieved page body.
- **Strict Provenance Gate**: If quote provenance fails, the claim is immediately classified as `Unverified` and **never** certified by the model.

### 2. Nemotron Evaluates Meaning
- For claims that pass deterministic provenance gating, `nvidia/Nemotron-3_5-Lightning` via the **Nebius Token Factory OpenAI-compatible API** evaluates whether the evidence semantically and logically supports, contradicts, or provides insufficient backing for the claim.
- All model inputs and outputs are validated strictly with **Zod schemas**.

### 3. Untrusted Input Invariant
- All retrieved web content is treated strictly as untrusted text. Embedded instructions or prompt injection attempts in retrieved source pages are ignored.

---

## Technology Stack

- **Framework**: Next.js 15 (App Router, React 19, TypeScript strict mode)
- **Styling**: Tailwind CSS (dark research workspace theme)
- **Validation**: Zod (strict JSON schema validation on all API requests and model responses)
- **LLM Inference**: `nvidia/Nemotron-3_5-Lightning` hosted on Nebius Token Factory (`https://api.tokenfactory.eu-north1.nebius.com/v1/`)
- **Web Retrieval**: Tavily Search API (`https://api.tavily.com/search`)
- **Report Engine**: Pure TypeScript export generator supporting GitHub Flavored Markdown and JSON
- **Test Runner**: Node Native Test Runner via `tsx`
- **Deployment Target**: Vercel

---

## Configuration & Environment Variables

Create a `.env.local` file in the project root directory (this file is ignored by `.gitignore`):

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

A template file [`.env.example`](.env.example) is provided in the repository with non-secret placeholders only.

---

## Local Development & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Automated Test Suite
FlowPilot Verify includes 26 automated unit tests covering request validation, Unicode quote normalization, URL allowlisting, fabricated quote rejection, provenance gating, malformed model outputs, provider failure handling, and report generation:
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
Executes the end-to-end 5-stage verification pipeline.

**Request Body:**
```json
{
  "question": "What are the latency benefits of NVIDIA Nemotron-3.5-Lightning?"
}
```

**Response Payload:**
- `question`: Original user research query.
- `plan`: Formulated research plan (search queries, focus areas, methodology notes).
- `answer`: Synthesized multi-paragraph answer drafted by Nemotron based strictly on retrieved sources.
- `findingsSummary`: High-level synthesis of provenance rate and semantic verdicts.
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
- `metadata`: Execution metadata (configured model ID, base URL, latency, timestamp).

### `GET /api/health`
Health and credential readiness check (returns configuration status without leaking secret characters).

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

# RAG Retrieval (Runtime)

Runtime RAG retrieval for grounding explanations and answers in retrieved data.

## Overview

The RAG retrieval system:
- Embeds user questions
- Retrieves top-k chunks from ChromaDB
- Applies similarity threshold
- Formats citations
- Enforces guardrails to prevent hallucinations

## Architecture

```
User Question
    ↓
1. Embed Question (OpenAI)
    ↓
2. Query ChromaDB
    ↓
3. Apply Similarity Threshold
    ↓
4. Format Citations
    ↓
5. Check Guardrails
    ↓
6. Return Chunks + Citations
    ↓
7. LLM Uses Only Retrieved Chunks
```

## Components

### 1. Retriever (`retriever.ts`)
- Embeds user questions
- Queries ChromaDB for similar chunks
- Applies similarity threshold (default: 0.4)
- Returns top-k chunks with metadata

### 2. Citation Formatter (`citation-formatter.ts`)
- Formats citations for UI display
- Formats citations for voice/TTS
- Validates citation URLs
- Extracts citations from chunks

### 3. Guardrails (`guardrails.ts`)
- Ensures LLM only uses retrieved chunks
- Requires citations for all answers
- Prevents hallucinated facts
- Validates response grounding

### 4. RAG Service (`rag-service.ts`)
- Main service coordinating retrieval
- Integrates all components
- Provides validation functions

## Usage

### Basic Retrieval

```typescript
import { retrieveRAGData } from './rag/rag-service';

const result = await retrieveRAGData(
  'What are the safety concerns in Jaipur?',
  'Jaipur',
  'Safety'
);

if (result.hasData) {
  console.log(`Retrieved ${result.chunks.length} chunks`);
  console.log(`Citations: ${result.formattedCitations.ui}`);
} else {
  console.log('No data available');
}
```

### For Explanations

```typescript
import { retrieveForExplanationRAG } from './rag/rag-service';

const result = await retrieveForExplanationRAG(
  'Why did you pick this place?',
  'Jaipur',
  'City Palace' // Optional context
);
```

### Integration with ResponseComposer

```typescript
// In ResponseComposer.composeExplanation()
const ragResult = await retrieveForExplanationRAG(question, city, context);

if (!ragResult.hasData) {
  return {
    text: getDataNotAvailableResponse(question, city),
    citations: [],
    state: context.state,
  };
}

// Use ragResult.guardrailPrompt in LLM prompt
// Use ragResult.chunks as context
// Include ragResult.citations in response
```

## Guardrails

### Rules Enforced

1. **LLM may ONLY use retrieved chunks**
   - Guardrail prompt instructs LLM
   - Response validation checks grounding

2. **Every answer must include citations**
   - Citations extracted from chunks
   - Validated for required fields

3. **No hallucinated facts allowed**
   - Response validated against chunks
   - Facts must appear in retrieved data

4. **If no chunks found → return "data not available"**
   - Standardized response
   - No guessing or making up facts

### Guardrail Prompt

The system generates a prompt for the LLM:

```
IMPORTANT RULES:
1. You may ONLY use information from the provided chunks below.
2. Do NOT make up, guess, or hallucinate any facts.
3. If the chunks don't contain the answer, say "I don't have specific information about that."
4. You MUST cite your sources when providing information.
5. Every factual claim must be supported by the chunks.

Provided chunks:
[Chunk 1]
...
```

## Similarity Threshold

- **Default**: 0.4 (cosine distance)
- **Meaning**: Chunks with distance > 0.4 are filtered out
- **Adjustable**: Can be configured per query

Lower distance = higher similarity. Threshold of 0.4 means:
- Distance ≤ 0.4 → Similarity ≥ 0.6 → Included
- Distance > 0.4 → Similarity < 0.6 → Filtered out

## Citations

### Format for UI

```
1. Wikivoyage - https://en.wikivoyage.org/wiki/Jaipur
2. Wikipedia - https://en.wikipedia.org/wiki/Jaipur
```

### Format for Voice

```
According to Wikivoyage and Wikipedia
```

### Citation Structure

```typescript
{
  source: 'Wikivoyage' | 'Wikipedia',
  url: string,
  excerpt: string,
  confidence: number
}
```

## Response Validation

After LLM generates response:

1. **Check grounding**: Response must be based on chunks
2. **Check citations**: Citations must be present
3. **Check facts**: Facts must appear in chunks
4. **Enforce guardrails**: Modify response if needed

## Error Handling

- **No chunks found**: Returns "data not available" response
- **Low similarity**: Warns but may still include chunks
- **Invalid citations**: Logs warning, continues
- **Guardrail violations**: Logs violations, may modify response

## Integration Points

### With Orchestrator

The RAG service is used in:
- `ResponseComposer.composeExplanation()` - For explanation queries
- `EXPLAINING` state - When user asks "why" questions

### With PolicyGuards

PolicyGuards validates:
- RAG citations are present
- Response is grounded
- No hallucinations

## Example Flow

1. User asks: "Why did you pick City Palace?"
2. System retrieves RAG data for "City Palace" in "Jaipur"
3. Retrieves 3 chunks about City Palace from Wikivoyage
4. Generates guardrail prompt with chunks
5. LLM generates response using only chunks
6. Response validated against chunks
7. Citations included in response
8. User sees response with sources

## Notes

- **Offline ingestion**: Data must be ingested first (Phase 6)
- **Runtime only**: Retrieval happens at runtime, not ingestion
- **No scraping**: All data comes from pre-loaded ChromaDB
- **Strict guardrails**: Prevents hallucinations by design


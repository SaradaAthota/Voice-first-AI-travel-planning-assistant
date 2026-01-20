# ChromaDB + RAG Deployment Guide

**Production-ready RAG deployment with ChromaDB for grounded citations.**

## 📋 Overview

This guide covers deploying the RAG (Retrieval-Augmented Generation) system with ChromaDB for production use. The RAG system provides grounded, cited responses by retrieving relevant travel information from Wikivoyage and Wikipedia.

## 🏗️ Architecture

```
┌─────────────────┐
│  User Query     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Embed Query    │ (OpenAI text-embedding-3-small)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Query ChromaDB │ (Vector similarity search)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Retrieve Chunks│ (Top-K with similarity threshold)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Extract        │ (city, source, section, url)
│  Citations      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Format         │ (UI + Voice formats)
│  Citations      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  LLM Response   │ (Grounded with citations)
│  + Citations    │
└─────────────────┘
```

## 📚 RAG Sources

### 1. Wikivoyage
- **URL**: `https://en.wikivoyage.org/wiki/{city}`
- **API**: Wikipedia API (`api.php?action=parse`)
- **Sections**: Safety, Eat, Get Around, Weather, See, Do
- **Use Case**: Travel-specific information, safety tips, local recommendations

### 2. Wikipedia
- **URL**: `https://en.wikipedia.org/wiki/{city}`
- **API**: Wikipedia API (`api.php?action=parse`)
- **Sections**: General information, history, culture
- **Use Case**: Background information, historical context

## 🔧 Chunking + Metadata Design

### Chunking Strategy

- **Chunk Size**: 2000 characters (~500 tokens)
- **Overlap**: 200 characters between chunks
- **Boundaries**: Sentence/paragraph boundaries when possible
- **Section-Based**: Chunks preserve section context

### Metadata Schema

Each chunk includes:

```typescript
{
  city: string;              // e.g., "Jaipur"
  source: 'wikivoyage' | 'wikipedia';
  section: string;           // e.g., "Safety", "Eat", "Get Around"
  url: string;               // Full source URL
  chunkIndex: number;        // Index within section (0-based)
  totalChunks: number;       // Total chunks in section
}
```

### ChromaDB Collection Schema

**Collection Name**: `travel_guides`

```typescript
{
  id: string;                    // Auto-generated UUID
  embedding: number[1536];        // OpenAI text-embedding-3-small vector
  document: string;               // Chunk text content
  metadata: {
    city: string;
    source: 'wikivoyage' | 'wikipedia';
    section: string;
    url: string;
    chunkIndex?: number;
    totalChunks?: number;
  }
}
```

## 🚀 Embedding Pipeline

### Model Configuration

- **Model**: OpenAI `text-embedding-3-small`
- **Dimensions**: 1536
- **Batch Size**: 100 chunks per batch
- **Rate Limiting**: 100ms delay between batches

### Pipeline Steps

1. **Fetch Pages**: Get HTML from Wikivoyage/Wikipedia APIs
2. **Parse Sections**: Extract semantic sections (Safety, Eat, etc.)
3. **Chunk Content**: Split sections into ~2000 char chunks with overlap
4. **Generate Embeddings**: Batch process chunks through OpenAI API
5. **Store in ChromaDB**: Save with metadata for citations

## ✅ Citation Enforcement

### Strict Rules

1. **Every tip must have source reference**
   - All retrieved chunks must include `url` and `source`
   - Citations are extracted from chunk metadata
   - Missing citations trigger guardrail violations

2. **Citation Validation**
   ```typescript
   validateCitations(citations) {
     // Checks:
     // - source is present
     // - url is present and valid
     // - url is accessible
   }
   ```

3. **Guardrail Enforcement**
   - If data retrieved but no citations → **Violation**
   - If citation missing source/URL → **Violation**
   - If similarity < 0.5 → **Warning**

4. **Response Formatting**
   - **UI Format**: Numbered list with source and URL
   - **Voice Format**: "According to Wikivoyage" (concise)
   - **Markdown Format**: `[1] Source - [URL](URL)`

### Example Grounded Response

**User Query**: "What are the safety tips for Jaipur?"

**RAG Retrieval**:
```json
{
  "chunks": [
    {
      "text": "Jaipur is generally safe, but be cautious of pickpockets in crowded areas...",
      "metadata": {
        "city": "Jaipur",
        "source": "wikivoyage",
        "section": "Safety",
        "url": "https://en.wikivoyage.org/wiki/Jaipur"
      },
      "similarity": 0.87
    }
  ],
  "citations": [
    {
      "source": "Wikivoyage",
      "url": "https://en.wikivoyage.org/wiki/Jaipur",
      "excerpt": "Jaipur is generally safe, but be cautious...",
      "confidence": 0.87
    }
  ]
}
```

**LLM Response** (with citations):
```
Jaipur is generally safe for travelers, but be cautious of pickpockets in crowded areas like markets and tourist attractions. Keep valuables secure and avoid displaying expensive items.

**Sources:**
1. Wikivoyage - https://en.wikivoyage.org/wiki/Jaipur
```

## 🐳 ChromaDB Docker Deployment

### Option 1: Docker Compose (Local/Development)

```yaml
services:
  chromadb:
    image: chromadb/chroma:latest
    container_name: voice-travel-chromadb
    ports:
      - "8000:8000"
    environment:
      - IS_PERSISTENT=TRUE
      - ANONYMIZED_TELEMETRY=FALSE
    volumes:
      - chromadb_data:/chroma/chroma
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/v1/heartbeat"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - voice-travel-network

volumes:
  chromadb_data:
    driver: local
```

**Start ChromaDB**:
```bash
docker-compose up -d chromadb
```

### Option 2: Standalone Docker (Production)

```bash
docker run -d \
  --name chromadb \
  -p 8000:8000 \
  -v chromadb_data:/chroma/chroma \
  -e IS_PERSISTENT=TRUE \
  -e ANONYMIZED_TELEMETRY=FALSE \
  chromadb/chroma:latest
```

### Option 3: Cloud Deployment (Recommended for Production)

#### Railway
1. Create new service in Railway
2. Use Dockerfile or deploy ChromaDB image
3. Set environment variables:
   - `IS_PERSISTENT=TRUE`
   - `ANONYMIZED_TELEMETRY=FALSE`
4. Get public URL (e.g., `https://chromadb-production.up.railway.app`)
5. Set `CHROMADB_URL` in backend environment variables

#### Render
1. Create new Web Service
2. Use Docker image: `chromadb/chroma:latest`
3. Set environment variables
4. Get public URL
5. Configure backend `CHROMADB_URL`

#### DigitalOcean App Platform
1. Create App → Docker
2. Use `chromadb/chroma:latest`
3. Configure persistent storage
4. Get public URL

## 🔄 Production Deployment Steps

### Step 1: Deploy ChromaDB

1. **Choose deployment method** (Docker, Railway, Render, etc.)
2. **Start ChromaDB service**
3. **Verify health**:
   ```bash
   curl http://your-chromadb-url:8000/api/v1/heartbeat
   ```
   Expected: `{"nanosecond heartbeat": <timestamp>}`

### Step 2: Configure Backend

Set environment variable in backend (Railway/Render):

```env
CHROMADB_URL=https://your-chromadb-url.com:8000
# OR for local Docker:
CHROMADB_URL=http://chromadb:8000
```

### Step 3: Ingest Data (One-Time)

Run ingestion script to populate ChromaDB:

```bash
cd backend
npm run ingest:rag -- --cities="Jaipur,Delhi,Mumbai,Bangalore"
```

**For production**, run this on a machine with:
- Access to ChromaDB URL
- OpenAI API key
- Network connectivity

### Step 4: Verify RAG System

Test retrieval:

```bash
# Test health
curl https://your-backend-url/api/health

# Test RAG (via chat endpoint)
curl -X POST https://your-backend-url/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are safety tips for Jaipur?",
    "tripId": "test-trip-id"
  }'
```

Expected response includes:
- `citations` array with sources
- Grounded response text
- `hasRAGData: true`

## 🛡️ Error Handling & Fail Gracefully

### When Data Missing

1. **No chunks retrieved**:
   ```typescript
   if (!result.hasData) {
     return getDataNotAvailableResponse(query, city);
     // Returns: "I don't have specific information about..."
   }
   ```

2. **ChromaDB connection failure**:
   ```typescript
   try {
     const client = getChromaClient();
   } catch (error) {
     console.error('ChromaDB connection failed:', error);
     // Return graceful error, don't crash
     return { hasData: false, chunks: [], citations: [] };
   }
   ```

3. **Embedding generation failure**:
   - Retry with exponential backoff
   - Fall back to keyword-based search if available
   - Return "data not available" if all fails

4. **Invalid citations**:
   - Validate citations before returning
   - Log warnings for missing citations
   - Filter out invalid citations

### Production Error Handling

```typescript
// In rag-service.ts
export async function retrieveRAGData(...) {
  try {
    // ... retrieval logic
  } catch (error) {
    console.error('RAG retrieval error:', error);
    
    // Don't crash - return empty result
    return {
      chunks: [],
      citations: [],
      hasData: false,
      guardrailPrompt: '',
      formattedCitations: { ui: '', voice: '' },
      guardrailCheck: {
        passed: false,
        violations: ['RAG system unavailable'],
        warnings: []
      }
    };
  }
}
```

## 📊 Monitoring & Validation

### Health Checks

1. **ChromaDB Health**:
   ```bash
   curl http://chromadb-url:8000/api/v1/heartbeat
   ```

2. **Backend RAG Health**:
   - Check logs for ChromaDB connection errors
   - Monitor citation validation warnings
   - Track retrieval success rate

### Metrics to Monitor

- **Retrieval Success Rate**: % of queries with chunks retrieved
- **Citation Coverage**: % of responses with valid citations
- **Similarity Scores**: Average similarity of retrieved chunks
- **ChromaDB Latency**: Query response time
- **Embedding API Errors**: OpenAI API failures

## 🔍 Example: Complete RAG Flow

### 1. User Query
```
"What are the best restaurants in Jaipur?"
```

### 2. Embed Query
```typescript
const queryEmbedding = await generateEmbedding(query);
// Returns: [0.123, -0.456, ..., 0.789] (1536 dimensions)
```

### 3. Query ChromaDB
```typescript
const results = await querySimilarChunks(
  queryEmbedding,
  { city: 'Jaipur', section: 'Eat' },
  topK: 5,
  threshold: 0.4
);
```

### 4. Retrieve Chunks
```json
{
  "chunks": [
    {
      "text": "Jaipur is famous for its Rajasthani cuisine. Try traditional dishes like dal baati churma...",
      "metadata": {
        "city": "Jaipur",
        "source": "wikivoyage",
        "section": "Eat",
        "url": "https://en.wikivoyage.org/wiki/Jaipur#Eat"
      },
      "similarity": 0.92,
      "distance": 0.08
    }
  ],
  "hasData": true
}
```

### 5. Extract Citations
```typescript
const citations = extractCitationsFromChunks(chunks);
// Returns:
[
  {
    source: "Wikivoyage",
    url: "https://en.wikivoyage.org/wiki/Jaipur#Eat",
    excerpt: "Jaipur is famous for its Rajasthani cuisine...",
    confidence: 0.92
  }
]
```

### 6. Format Citations
- **UI**: `"1. Wikivoyage - https://en.wikivoyage.org/wiki/Jaipur#Eat"`
- **Voice**: `"According to Wikivoyage"`

### 7. LLM Response (with RAG context)
```
Jaipur offers excellent Rajasthani cuisine. Traditional dishes include dal baati churma, gatte ki sabzi, and ker sangri. Popular restaurants include Laxmi Mishthan Bhandar and Rawat Mishthan Bhandar in the old city.

**Sources:**
1. Wikivoyage - https://en.wikivoyage.org/wiki/Jaipur#Eat
```

## 📝 Environment Variables

### Required

```env
# ChromaDB Connection
CHROMADB_URL=https://your-chromadb-url.com:8000

# OpenAI (for embeddings)
OPENAI_API_KEY=sk-your-openai-key
```

### Optional

```env
# ChromaDB Collection Name (default: travel_guides)
CHROMADB_COLLECTION=travel_guides

# Similarity Threshold (default: 0.4)
RAG_SIMILARITY_THRESHOLD=0.4

# Top-K Results (default: 5)
RAG_TOP_K=5
```

## 🚨 Troubleshooting

### Issue: ChromaDB Connection Failed

**Symptoms**: `CHROMADB_URL environment variable is required in production`

**Fix**:
1. Verify ChromaDB is running: `curl http://chromadb-url:8000/api/v1/heartbeat`
2. Check `CHROMADB_URL` is set correctly in backend env vars
3. Verify network connectivity between backend and ChromaDB

### Issue: No Chunks Retrieved

**Symptoms**: `hasData: false` in all responses

**Fix**:
1. Verify data was ingested: Check ChromaDB collection has documents
2. Check similarity threshold (may be too high)
3. Verify embeddings were generated correctly during ingestion

### Issue: Missing Citations

**Symptoms**: Citations array is empty despite chunks retrieved

**Fix**:
1. Verify chunk metadata includes `url` and `source`
2. Check citation extraction logic
3. Review guardrail validation logs

### Issue: Low Similarity Scores

**Symptoms**: All chunks have similarity < 0.5

**Fix**:
1. Lower similarity threshold (e.g., 0.3)
2. Verify query embedding is correct
3. Check if ingested data matches query domain

## 📚 Additional Resources

- **ChromaDB Docs**: https://docs.trychroma.com/
- **OpenAI Embeddings**: https://platform.openai.com/docs/guides/embeddings
- **RAG Best Practices**: See `backend/src/rag/README.md`

## ✅ Production Checklist

- [ ] ChromaDB deployed and accessible
- [ ] `CHROMADB_URL` set in backend environment
- [ ] Data ingested for target cities
- [ ] Health check endpoint responding
- [ ] Citations appearing in responses
- [ ] Error handling tested (ChromaDB down scenario)
- [ ] Monitoring configured (logs, metrics)
- [ ] Backup strategy for ChromaDB data (if using persistent storage)

---

**Status**: ✅ Production Ready

**Last Updated**: 2024-01-20


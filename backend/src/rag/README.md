# RAG Ingestion Pipeline

Offline ingestion pipeline for loading travel guide data from Wikivoyage and Wikipedia into ChromaDB.

## Overview

This pipeline:
- Fetches city pages from Wikivoyage and Wikipedia
- Chunks content by semantic sections (Safety, Eat, Get Around, Weather)
- Generates embeddings using OpenAI
- Stores in ChromaDB with metadata for citations

## Architecture

```
Ingestion Script
    ↓
1. Fetch Pages (Wikivoyage/Wikipedia)
    ↓
2. Parse HTML and Extract Sections
    ↓
3. Chunk by Sections
    ↓
4. Generate Embeddings (OpenAI)
    ↓
5. Store in ChromaDB
    ↓
6. Metadata: { city, source, section, url }
```

## Usage

### Basic Usage

```bash
npm run ingest:rag -- --cities="Jaipur,Delhi,Mumbai"
```

### With Specific Sources

```bash
npm run ingest:rag -- --cities="Jaipur" --sources="wikivoyage,wikipedia"
```

### Single City

```bash
npm run ingest:rag -- --cities="Jaipur"
```

## ChromaDB Collection Schema

**Collection Name**: `travel_guides`

**Document Structure**:
- `id`: Auto-generated unique ID
- `embedding`: Vector (1536 dimensions, OpenAI text-embedding-3-small)
- `document`: Text content (chunk)
- `metadata`:
  - `city`: City name (string)
  - `source`: 'wikivoyage' | 'wikipedia' (string)
  - `section`: Section name (string)
  - `url`: Source URL (string)
  - `chunkIndex`: Index within section (number)
  - `totalChunks`: Total chunks in section (number)

## Target Sections

The pipeline extracts and chunks the following sections:

- **Safety**: Safety information and warnings
- **Eat**: Food and dining recommendations
- **Get Around**: Transportation information
- **Weather**: Weather and climate information

Additional sections may be included but are marked as "Other".

## Chunking Strategy

- **Chunk Size**: ~2000 characters (~500 tokens)
- **Overlap**: 200 characters between chunks
- **Boundaries**: Breaks at sentence or paragraph boundaries when possible

## Embeddings

- **Model**: OpenAI `text-embedding-3-small`
- **Dimensions**: 1536
- **Batch Size**: 100 chunks per batch
- **Rate Limiting**: 100ms delay between batches

## Environment Variables

Required:
- `OPENAI_API_KEY`: OpenAI API key for embeddings
- `CHROMADB_URL`: ChromaDB connection URL (default: `http://localhost:8000`)

## Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start ChromaDB** (Docker):
   ```bash
   docker run -d -p 8000:8000 chromadb/chroma
   ```

3. **Set Environment Variables**:
   ```bash
   export OPENAI_API_KEY=your_key_here
   export CHROMADB_URL=http://localhost:8000
   ```

4. **Run Ingestion**:
   ```bash
   npm run ingest:rag -- --cities="Jaipur"
   ```

## Output

The script prints:
- Progress for each city and source
- Number of sections found
- Number of chunks created
- Summary at the end

Example output:
```
Processing city: Jaipur
  Fetching from wikivoyage...
    Found page: https://en.wikivoyage.org/wiki/Jaipur
    Sections found: 8
    Created 12 chunks
    Generating embeddings...
    Storing in ChromaDB...
    ✓ Successfully ingested 12 chunks
```

## Metadata for Citations

Each chunk includes metadata that supports citations:

```typescript
{
  city: "Jaipur",
  source: "wikivoyage",
  section: "Safety",
  url: "https://en.wikivoyage.org/wiki/Jaipur",
  chunkIndex: 0,
  totalChunks: 2
}
```

This metadata is used when retrieving chunks for RAG to provide citations in responses.

## Notes

- **One-time ingestion**: This is an offline script, not for runtime use
- **No runtime scraping**: All data is pre-loaded into ChromaDB
- **Rate limiting**: Includes delays to respect API rate limits
- **Error handling**: Continues processing even if one city/source fails
- **Idempotent**: Can be run multiple times (will add duplicates, but that's okay)

## Next Steps

After ingestion, the RAG system can:
- Query ChromaDB for similar chunks
- Use chunks to ground explanations
- Provide citations using metadata

See `src/rag/storage.ts` for query functions.


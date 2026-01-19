/**
 * RAG Ingestion Script
 * 
 * One-time ingestion script for offline data loading.
 * 
 * Usage:
 *   npm run ingest:rag -- --cities "Jaipur,Delhi,Mumbai"
 *   npm run ingest:rag -- --cities "Jaipur" --sources "wikivoyage,wikipedia"
 * 
 * Rules:
 * - One-time ingestion (offline)
 * - No runtime scraping
 * - Processes cities in sequence
 * - Stores in ChromaDB with metadata for citations
 */

import { fetchWikivoyagePage, fetchWikipediaPage } from './fetchers';
import { chunkPage } from './chunker';
import { generateEmbeddings } from './embeddings';
import { storeChunks } from './storage';
import { IngestionResult } from './types';
import { closeChromaConnection } from './chromadb-client';

/**
 * Main ingestion function
 */
async function ingestCities(
  cities: string[],
  sources: Array<'wikivoyage' | 'wikipedia'> = ['wikivoyage', 'wikipedia']
): Promise<IngestionResult[]> {
  const results: IngestionResult[] = [];

  for (const city of cities) {
    console.log(`\nProcessing city: ${city}`);

    for (const source of sources) {
      console.log(`  Fetching from ${source}...`);

      try {
        // Step 1: Fetch page
        const page = source === 'wikivoyage'
          ? await fetchWikivoyagePage(city)
          : await fetchWikipediaPage(city);

        if (!page) {
          console.log(`    No page found for ${city} on ${source}`);
          results.push({
            city,
            source,
            url: '',
            sectionsProcessed: 0,
            chunksCreated: 0,
            success: false,
            error: 'Page not found',
          });
          continue;
        }

        console.log(`    Found page: ${page.url}`);
        console.log(`    Sections found: ${Object.keys(page.sections).length}`);

        // Step 2: Chunk content
        const chunks = chunkPage(page);
        console.log(`    Created ${chunks.length} chunks`);

        if (chunks.length === 0) {
          console.log(`    No chunks created (no target sections found)`);
          results.push({
            city,
            source,
            url: page.url,
            sectionsProcessed: Object.keys(page.sections).length,
            chunksCreated: 0,
            success: false,
            error: 'No target sections found',
          });
          continue;
        }

        // Step 3: Generate embeddings
        console.log(`    Generating embeddings...`);
        const embeddings = await generateEmbeddings(chunks);

        // Step 4: Store in ChromaDB
        console.log(`    Storing in ChromaDB...`);
        await storeChunks(chunks, embeddings);

        results.push({
          city,
          source,
          url: page.url,
          sectionsProcessed: Object.keys(page.sections).length,
          chunksCreated: chunks.length,
          success: true,
        });

        console.log(`    ✓ Successfully ingested ${chunks.length} chunks`);
      } catch (error) {
        console.error(`    ✗ Error processing ${city} from ${source}:`, error);
        results.push({
          city,
          source,
          url: '',
          sectionsProcessed: 0,
          chunksCreated: 0,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      // Small delay between sources
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Delay between cities
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return results;
}

/**
 * Main entry point
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const citiesArg = args.find(arg => arg.startsWith('--cities='))?.split('=')[1];
  const sourcesArg = args.find(arg => arg.startsWith('--sources='))?.split('=')[1];

  if (!citiesArg) {
    console.error('Usage: npm run ingest:rag -- --cities="City1,City2,City3" [--sources="wikivoyage,wikipedia"]');
    process.exit(1);
  }

  const cities = citiesArg.split(',').map(c => c.trim());
  const sources = sourcesArg
    ? (sourcesArg.split(',').map(s => s.trim()) as Array<'wikivoyage' | 'wikipedia'>)
    : ['wikivoyage', 'wikipedia'];

  console.log('RAG Ingestion Pipeline');
  console.log('====================');
  console.log(`Cities: ${cities.join(', ')}`);
  console.log(`Sources: ${sources.join(', ')}`);
  console.log('');

  try {
    const results = await ingestCities(cities, sources);

    // Print summary
    console.log('\n\nIngestion Summary');
    console.log('==================');
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`\nSuccessful: ${successful.length}`);
    successful.forEach(r => {
      console.log(`  ✓ ${r.city} (${r.source}): ${r.chunksCreated} chunks from ${r.sectionsProcessed} sections`);
    });

    if (failed.length > 0) {
      console.log(`\nFailed: ${failed.length}`);
      failed.forEach(r => {
        console.log(`  ✗ ${r.city} (${r.source}): ${r.error || 'Unknown error'}`);
      });
    }

    const totalChunks = successful.reduce((sum, r) => sum + r.chunksCreated, 0);
    console.log(`\nTotal chunks ingested: ${totalChunks}`);
  } catch (error) {
    console.error('Fatal error during ingestion:', error);
    process.exit(1);
  } finally {
    await closeChromaConnection();
  }
}

// Run if executed directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('\nIngestion complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Ingestion failed:', error);
      process.exit(1);
    });
}

export { ingestCities };


import { createClient } from '@supabase/supabase-js';
import { pipeline } from '@xenova/transformers';
import * as shared from '@ai-chatbot/shared';


const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = shared.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
const EMBEDDING_DIMENSIONS = 384;

let embeddingPipelinePromise: Promise<any> | undefined;

async function getEmbeddingPipeline() {
  if (!embeddingPipelinePromise) {
    embeddingPipelinePromise = pipeline('feature-extraction', EMBEDDING_MODEL);
  }
  return embeddingPipelinePromise;
}

type XenovaTensor = {
  data: Float32Array | number[];
  dims: number[];
};

function toArray(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.map((item) => Number(item));
  }
  if (value instanceof Float32Array || value instanceof Float64Array) {
    return Array.from(value);
  }
  throw new Error('Unsupported embedding format');
}

function tensorToMatrix(value: unknown): number[][] {
  if (value && typeof value === 'object' && 'data' in value && 'dims' in value) {
    const tensor = value as XenovaTensor;
    const data = toArray(tensor.data);
    const dims = tensor.dims;

    if (dims.length === 3) {
      const [, seq, dim] = dims;
      const rows: number[][] = [];
      for (let tokenIndex = 0; tokenIndex < seq; tokenIndex += 1) {
        const offset = tokenIndex * dim;
        rows.push(data.slice(offset, offset + dim));
      }
      return rows;
    }

    if (dims.length === 2) {
      const [seq, dim] = dims;
      const rows: number[][] = [];
      for (let tokenIndex = 0; tokenIndex < seq; tokenIndex += 1) {
        const offset = tokenIndex * dim;
        rows.push(data.slice(offset, offset + dim));
      }
      return rows;
    }

    return [data];
  }

  if (Array.isArray(value)) {
    if (Array.isArray(value[0])) {
      return value as number[][];
    }
    return [toArray(value)];
  }

  throw new Error('Unsupported embedding format');
}

function normalize(vector: number[]) {
  const length = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  return length === 0 ? vector : vector.map((value) => value / length);
}

function meanPool(embeddings: number[][]) {
  if (embeddings.length === 0) {
    return new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  }

  const dims = embeddings[0].length;
  const pooled = new Array<number>(dims).fill(0);

  for (const tokenEmbedding of embeddings) {
    const row = toArray(tokenEmbedding);
    for (let i = 0; i < dims; i += 1) {
      pooled[i] += row[i] ?? 0;
    }
  }

  return pooled.map((value) => value / embeddings.length);
}

/**
 * Generate an embedding vector for a given text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || !text.trim()) {
    return new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  }

  try {
    const embedPipeline = await getEmbeddingPipeline();
    const rawOutput = await embedPipeline(text);

    const rawEmbeddings: number[][] = tensorToMatrix(rawOutput);

    const pooled = meanPool(rawEmbeddings);
    const normalized = normalize(pooled);

    if (normalized.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(`Unexpected embedding dimension: ${normalized.length}`);
    }

    return normalized;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Embedding generation failed: ${message}`);
  }
}

/**
 * Store a page chunk and its embedding in the database
 */
export async function storeEmbedding(
  pageId: string,
  chunkIndex: number,
  content: string,
  embedding: number[]
) {
  const { error } = await supabase.from('embeddings').insert({
    page_id: pageId,
    chunk_index: chunkIndex,
    content: content,
    embedding: embedding,
  });

  if (error) {
    throw new Error(`Failed to store embedding: ${error.message}`);
  }
}

/**
 * Search for similar content based on a query (user message)
 * Returns top 5 most relevant chunks
 */
export async function searchSimilarContent(query: string, websiteId: string, limit: number = 5) {
  // First generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);
  
  // Perform vector similarity search using pgvector's cosine distance
  // Join with website_pages to filter by website_id
  const { data, error } = await supabase.rpc('match_embeddings', {
    query_embedding: queryEmbedding,
    match_threshold: 0.7,   // Minimum similarity (0-1)
    match_count: limit,
    filter_website_id: websiteId,
  });

  if (error) {
    console.error('Vector search error:', error);
    return [];
  }

  return data || [];
}
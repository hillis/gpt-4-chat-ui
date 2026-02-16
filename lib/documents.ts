import fs from "fs";
import path from "path";
import crypto from "crypto";

// --- Types ---

export interface DocumentMeta {
  id: string;
  name: string;
  addedAt: string;
  chunkCount: number;
  charCount: number;
}

export interface DocumentChunk {
  documentId: string;
  documentName: string;
  index: number;
  content: string;
}

interface StoredData {
  documents: DocumentMeta[];
  chunks: DocumentChunk[];
}

// --- Storage ---

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "documents.json");

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readStore(): StoredData {
  ensureDataDir();
  if (!fs.existsSync(STORE_PATH)) {
    return { documents: [], chunks: [] };
  }
  const raw = fs.readFileSync(STORE_PATH, "utf-8");
  return JSON.parse(raw) as StoredData;
}

function writeStore(data: StoredData): void {
  ensureDataDir();
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf-8");
}

// --- Chunking ---

const MAX_CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;

function chunkText(text: string): string[] {
  // First split by double newlines (paragraphs)
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const chunks: string[] = [];

  for (const para of paragraphs) {
    if (para.length <= MAX_CHUNK_SIZE) {
      chunks.push(para);
    } else {
      // Split long paragraphs by sentences, then assemble chunks
      const sentences = para.split(/(?<=[.!?])\s+/);
      let current = "";

      for (const sentence of sentences) {
        if (current.length + sentence.length + 1 > MAX_CHUNK_SIZE && current.length > 0) {
          chunks.push(current.trim());
          // Keep overlap from end of previous chunk
          const words = current.split(/\s+/);
          const overlapWords = words.slice(-Math.ceil(CHUNK_OVERLAP / 6));
          current = overlapWords.join(" ") + " " + sentence;
        } else {
          current += (current ? " " : "") + sentence;
        }
      }

      if (current.trim().length > 0) {
        chunks.push(current.trim());
      }
    }
  }

  return chunks;
}

// --- Search (TF-IDF) ---

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function computeTermFrequency(tokens: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const token of tokens) {
    freq.set(token, (freq.get(token) || 0) + 1);
  }
  return freq;
}

export function searchDocuments(
  query: string,
  topK: number = 5,
): DocumentChunk[] {
  const store = readStore();
  if (store.chunks.length === 0) return [];

  const queryTokens = new Set(tokenize(query));
  if (queryTokens.size === 0) return [];

  // Compute document frequency for IDF
  const docFreq = new Map<string, number>();
  const chunkTokenMaps: Map<string, number>[] = [];

  for (const chunk of store.chunks) {
    const tokens = tokenize(chunk.content);
    const tf = computeTermFrequency(tokens);
    chunkTokenMaps.push(tf);

    const uniqueTokens = new Set(tokens);
    for (const token of queryTokens) {
      if (uniqueTokens.has(token)) {
        docFreq.set(token, (docFreq.get(token) || 0) + 1);
      }
    }
  }

  const N = store.chunks.length;

  // Score each chunk using TF-IDF
  const scored = store.chunks.map((chunk, i) => {
    const tf = chunkTokenMaps[i];
    let score = 0;

    for (const term of queryTokens) {
      const termFreq = tf.get(term) || 0;
      const df = docFreq.get(term) || 0;
      if (termFreq > 0 && df > 0) {
        const idf = Math.log(1 + N / df);
        score += (1 + Math.log(termFreq)) * idf;
      }
    }

    return { chunk, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((s) => s.chunk);
}

// --- CRUD operations ---

const MAX_DOCUMENT_SIZE = 200_000; // 200KB text limit
const MAX_DOCUMENTS = 50;

export function listDocuments(): DocumentMeta[] {
  return readStore().documents;
}

export function addDocument(
  name: string,
  content: string,
): DocumentMeta {
  if (content.length > MAX_DOCUMENT_SIZE) {
    throw new Error(`Document too large (max ${MAX_DOCUMENT_SIZE / 1000}KB)`);
  }

  const store = readStore();

  if (store.documents.length >= MAX_DOCUMENTS) {
    throw new Error(`Maximum ${MAX_DOCUMENTS} documents reached`);
  }

  const id = crypto.randomUUID();
  const chunks = chunkText(content);

  const meta: DocumentMeta = {
    id,
    name: name.slice(0, 200),
    addedAt: new Date().toISOString(),
    chunkCount: chunks.length,
    charCount: content.length,
  };

  const newChunks: DocumentChunk[] = chunks.map((c, i) => ({
    documentId: id,
    documentName: name,
    index: i,
    content: c,
  }));

  store.documents.push(meta);
  store.chunks.push(...newChunks);
  writeStore(store);

  return meta;
}

export function removeDocument(id: string): boolean {
  const store = readStore();
  const docIndex = store.documents.findIndex((d) => d.id === id);

  if (docIndex === -1) return false;

  store.documents.splice(docIndex, 1);
  store.chunks = store.chunks.filter((c) => c.documentId !== id);
  writeStore(store);

  return true;
}

export function buildContextFromChunks(chunks: DocumentChunk[]): string {
  if (chunks.length === 0) return "";

  const parts = chunks.map(
    (c) => `[From "${c.documentName}"]\n${c.content}`,
  );

  return (
    "Use the following document excerpts to help answer the user's question. " +
    "If the excerpts don't contain relevant information, say so and answer based on your general knowledge.\n\n" +
    "---\n" +
    parts.join("\n\n---\n") +
    "\n---"
  );
}

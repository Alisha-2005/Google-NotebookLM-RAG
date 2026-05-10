import { NextRequest, NextResponse } from "next/server";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { Document } from "@langchain/core/documents";
import { v4 as uuidv4 } from "uuid";
import pdfParse from "pdf-parse";

// Run in Node.js runtime (required for pdf-parse)
export const runtime = "nodejs";
// 60 seconds max duration for large PDFs
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // ── 1. Extract text from PDF ──────────────────────────────────
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const textResult = await pdfParse(buffer);
    const textContent = textResult.text;

    if (!textContent || textContent.trim().length === 0) {
      return NextResponse.json(
        { error: "Could not extract text from the PDF" },
        { status: 400 }
      );
    }

    // ── 2. Chunking ───────────────────────────────────────────────
    // Strategy: RecursiveCharacterTextSplitter
    //   - chunkSize  = 1000 characters — large enough to hold context
    //   - chunkOverlap = 200 characters — preserves sentence boundaries
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const document = new Document({
      pageContent: textContent,
      metadata: { source: file.name },
    });

    const chunks = await splitter.splitDocuments([document]);

    // ── 3. Embedding & 4. Storage ─────────────────────────────────
    // Each uploaded document gets its own Qdrant collection so
    // conversations never bleed across documents.
    const collectionName = `doc_${uuidv4().replace(/-/g, "_")}`;

    const embeddings = new OpenAIEmbeddings({
      model: "text-embedding-3-large",
    });

    const qdrantUrl = process.env.QDRANT_URL || "http://localhost:6333";
    const qdrantApiKey = process.env.QDRANT_API_KEY;

    await QdrantVectorStore.fromDocuments(chunks, embeddings, {
      url: qdrantUrl,
      apiKey: qdrantApiKey,
      collectionName,
    });

    return NextResponse.json({
      success: true,
      collectionId: collectionName,
      chunksProcessed: chunks.length,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error processing file:", error);
    return NextResponse.json(
      { error: "Failed to process the document: " + message },
      { status: 500 }
    );
  }
}

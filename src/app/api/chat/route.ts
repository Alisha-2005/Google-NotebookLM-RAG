import { NextRequest, NextResponse } from "next/server";
import { OpenAIEmbeddings } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { OpenAI } from "openai";

// Qdrant client requires Node.js runtime (not edge)
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { query, collectionId } = await req.json();

    if (!query || !collectionId) {
      return NextResponse.json(
        { error: "Missing query or collectionId" },
        { status: 400 }
      );
    }

    const embeddings = new OpenAIEmbeddings({
      model: "text-embedding-3-large",
    });

    const qdrantUrl = process.env.QDRANT_URL || "http://localhost:6333";
    const qdrantApiKey = process.env.QDRANT_API_KEY;

    // ── 5. Retrieval ──────────────────────────────────────────────
    const vectorStore = await QdrantVectorStore.fromExistingCollection(
      embeddings,
      {
        url: qdrantUrl,
        apiKey: qdrantApiKey,
        collectionName: collectionId,
      }
    );

    const retriever = vectorStore.asRetriever({ k: 4 });
    const searchedChunks = await retriever.invoke(query);

    // ── 6. Generation ─────────────────────────────────────────────
    const client = new OpenAI();

    const contextText = searchedChunks
      .map((chunk) => chunk.pageContent)
      .join("\n\n---\n\n");

    const systemPrompt = `You are a helpful AI assistant for NotebookLM RAG. Your task is to answer the user's question based strictly on the provided document context.

Context from document:
${contextText}

Rules:
- You MUST answer the query based ONLY on the provided context.
- If the answer is not contained within the context, you must clearly state that you do not know or that the information is not present in the uploaded document.
- Do NOT use your general knowledge to answer.
- Provide a clear, concise, and structured answer.
`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query },
      ],
      temperature: 0.1,
    });

    return NextResponse.json({
      success: true,
      answer:
        response.choices[0]?.message?.content || "No answer generated.",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error in chat route:", error);
    return NextResponse.json(
      { error: "Failed to generate answer: " + message },
      { status: 500 }
    );
  }
}

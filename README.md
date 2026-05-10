# 📓 NotebookLM RAG — Chat With Your Documents

A full-stack RAG (Retrieval Augmented Generation) application inspired by Google NotebookLM. Upload any PDF and have a natural language conversation grounded in the document's actual content.

**Live Demo:** [Deployed on Vercel](#) *(add your link here)*

---

## ✨ Features

- **PDF Upload & Parsing** — Upload any PDF and have it processed automatically.
- **Intelligent Chunking** — Uses `RecursiveCharacterTextSplitter` (1000 chars, 200 overlap) to maintain semantic boundaries.
- **Vector Search** — Embeds chunks with OpenAI `text-embedding-3-large` and stores them in Qdrant for fast similarity search.
- **Grounded Answers** — LLM answers are strictly based on the uploaded document context — not from general knowledge.
- **Beautiful UI** — Glassmorphic, dark-mode interface with smooth animations.

---

## 🏗️ Architecture — RAG Pipeline

```
┌──────────┐    ┌──────────┐    ┌───────────────────┐    ┌────────┐    ┌───────────┐
│  Upload  │───▶│  Parse   │───▶│  Chunk (Recursive │───▶│ Embed  │───▶│  Store in │
│  PDF     │    │  (pdf-   │    │  CharacterText    │    │ (OpenAI│    │  Qdrant   │
│          │    │  parse)  │    │  Splitter)        │    │  3072d)│    │  VectorDB │
└──────────┘    └──────────┘    └───────────────────┘    └────────┘    └───────────┘

┌──────────┐    ┌──────────┐    ┌───────────────────┐    ┌────────────────────────┐
│  User    │───▶│  Embed   │───▶│  Retrieve Top-K   │───▶│  Generate Answer with  │
│  Query   │    │  Query   │    │  Chunks from      │    │  GPT-4o-mini (grounded │
│          │    │          │    │  Qdrant           │    │  in retrieved context) │
└──────────┘    └──────────┘    └───────────────────┘    └────────────────────────┘
```

### Chunking Strategy

We use **RecursiveCharacterTextSplitter** from Langchain:
- **Chunk Size:** 1000 characters
- **Chunk Overlap:** 200 characters
- **Why:** This strategy recursively splits text by different separators (`\n\n`, `\n`, ` `, `""`) to create semantically meaningful chunks. The 200-character overlap ensures that sentences split across chunk boundaries are still captured in at least one chunk.

---

## 🛠️ Tech Stack

| Layer        | Technology                          |
|-------------|--------------------------------------|
| Framework   | Next.js 16 (App Router)              |
| Frontend    | React 19, Vanilla CSS                |
| PDF Parsing | pdf-parse v2                         |
| Chunking    | @langchain/textsplitters             |
| Embeddings  | OpenAI text-embedding-3-large        |
| Vector DB   | Qdrant (Cloud or self-hosted)        |
| LLM         | GPT-4o-mini via OpenAI API           |
| Deployment  | Vercel                               |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- An OpenAI API key
- Qdrant instance (local via Docker or [Qdrant Cloud](https://cloud.qdrant.io/))

### Local Setup

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO

# 2. Install dependencies
npm install --legacy-peer-deps

# 3. Create environment file
cp .env.example .env.local
# Edit .env.local and add your API keys

# 4. (Optional) Start local Qdrant via Docker
docker run -p 6333:6333 qdrant/qdrant

# 5. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and upload a PDF to start chatting.

### Environment Variables

| Variable         | Description                                      |
|-----------------|--------------------------------------------------|
| `OPENAI_API_KEY` | Your OpenAI API key                              |
| `QDRANT_URL`     | Qdrant instance URL (e.g. `http://localhost:6333`)|
| `QDRANT_API_KEY`  | Qdrant API key (required for Qdrant Cloud)       |

---

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── upload/route.ts   # PDF ingestion, chunking, embedding, storage
│   │   └── chat/route.ts     # Retrieval + LLM generation
│   ├── globals.css            # Design system (dark theme, glassmorphism)
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Main UI (upload + chat)
```

---

## 📄 License

MIT

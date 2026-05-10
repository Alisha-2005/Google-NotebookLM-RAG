"use client";

import { useState, useRef } from "react";
import { UploadCloud, MessageSquare, Send, FileText, CheckCircle2, AlertCircle } from "lucide-react";

type Message = {
  id: string;
  role: "user" | "ai";
  content: string;
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "processing" | "ready" | "error">("idle");
  const [collectionId, setCollectionId] = useState<string | null>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState("");
  const [asking, setAsking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setUploadStatus("processing");
    
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      const data = await res.json();
      setCollectionId(data.collectionId);
      setUploadStatus("ready");
      setMessages([{ id: "welcome", role: "ai", content: "Document successfully analyzed and indexed. What would you like to know?" }]);
    } catch (error) {
      console.error(error);
      setUploadStatus("error");
    } finally {
      setUploading(false);
    }
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !collectionId || asking) return;

    const userMessage = query.trim();
    setQuery("");
    setMessages(prev => [...prev, { id: Date.now().toString(), role: "user", content: userMessage }]);
    setAsking(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userMessage, collectionId }),
      });

      if (!res.ok) {
        throw new Error("Failed to get answer");
      }

      const data = await res.json();
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "ai", content: data.answer }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "ai", content: "Sorry, I encountered an error while trying to answer your question." }]);
    } finally {
      setAsking(false);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  return (
    <div className="container">
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '2.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MessageSquare size={36} color="var(--primary)" />
            NotebookLM RAG
          </h1>
          <p style={{ color: 'var(--muted)', marginTop: '0.5rem' }}>Chat with your documents powered by Langchain & Qdrant</p>
        </div>
        
        <div className="status-badge">
          <div className={`status-indicator ${uploadStatus}`} />
          {uploadStatus === 'idle' && 'Waiting for document...'}
          {uploadStatus === 'processing' && 'Ingesting & Chunking...'}
          {uploadStatus === 'ready' && 'Ready to chat'}
          {uploadStatus === 'error' && 'Error processing file'}
        </div>
      </header>

      <div className="app-grid">
        {/* Sidebar / Upload Panel */}
        <aside className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={20} />
              Document Source
            </h3>
            
            <div className={`upload-zone ${file ? 'has-file' : ''}`}>
              {!file ? (
                <>
                  <UploadCloud size={48} color="var(--primary)" />
                  <p>Drag & drop a PDF here, or click to browse</p>
                  <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
                    Select File
                    <input type="file" accept=".pdf" onChange={handleFileChange} style={{ display: 'none' }} />
                  </label>
                </>
              ) : (
                <>
                  <FileText size={48} color={uploadStatus === 'ready' ? 'var(--success)' : 'var(--primary)'} />
                  <p style={{ wordBreak: 'break-all', fontWeight: 500 }}>{file.name}</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  
                  {uploadStatus === 'idle' && (
                    <button className="btn btn-primary" onClick={handleUpload} disabled={uploading} style={{ width: '100%', marginTop: '1rem' }}>
                      {uploading ? (
                        <>
                          <div className="loader"><span></span><span></span><span></span></div>
                          Processing...
                        </>
                      ) : (
                        'Upload & Index'
                      )}
                    </button>
                  )}
                  
                  {uploadStatus === 'ready' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', marginTop: '1rem' }}>
                      <CheckCircle2 size={18} /> Indexed Successfully
                    </div>
                  )}

                  {uploadStatus === 'error' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--error)', marginTop: '1rem' }}>
                      <AlertCircle size={18} /> Processing Failed
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          
          <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid var(--card-border)', fontSize: '0.875rem', color: 'var(--muted)' }}>
            <strong>Chunking Strategy:</strong><br/>
            RecursiveCharacterTextSplitter (1000 chars, 200 overlap)
          </div>
        </aside>

        {/* Main Chat Interface */}
        <main className="glass-panel chat-container">
          <div className="chat-messages">
            {messages.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', opacity: 0.5 }}>
                <MessageSquare size={64} style={{ marginBottom: '1rem' }} />
                <h2>No messages yet</h2>
                <p>Upload a document to start chatting</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`message ${msg.role}`}>
                  <div className="message-avatar">
                    {msg.role === 'user' ? 'U' : 'AI'}
                  </div>
                  <div className="message-content">
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            {asking && (
              <div className="message ai">
                <div className="message-avatar">AI</div>
                <div className="message-content">
                  <div className="loader" style={{ marginTop: '8px' }}><span></span><span></span><span></span></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-container">
            <form onSubmit={handleAsk} className="chat-input-form">
              <input
                type="text"
                className="chat-input"
                placeholder={uploadStatus === 'ready' ? "Ask a question about your document..." : "Upload a document first..."}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={uploadStatus !== 'ready' || asking}
              />
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={!query.trim() || uploadStatus !== 'ready' || asking}
                style={{ padding: '0.5rem', width: '48px', borderRadius: '8px' }}
              >
                <Send size={20} />
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}

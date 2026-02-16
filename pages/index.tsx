import { useState, useRef, useEffect, useCallback, FormEvent, KeyboardEvent, ChangeEvent } from "react";
import Head from "next/head";
import styles from "../styles/Home.module.css";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import CircularProgress from "@mui/material/CircularProgress";
import Link from "next/link";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ModelOption {
  id: string;
  name: string;
  provider: string;
}

interface DocumentInfo {
  id: string;
  name: string;
  addedAt: string;
  chunkCount: number;
  charCount: number;
}

export default function Home() {
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi there! How can I help?" },
  ]);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelOption | null>(null);
  const [modelsLoading, setModelsLoading] = useState(true);

  // Document state
  const [docsOpen, setDocsOpen] = useState(false);
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [useDocuments, setUseDocuments] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docName, setDocName] = useState("");
  const [docContent, setDocContent] = useState("");

  const messageListRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents);
      }
    } catch {
      // silently fail
    }
  }, []);

  // Fetch available models on mount
  useEffect(() => {
    async function fetchModels() {
      try {
        const res = await fetch("/api/providers");
        if (res.ok) {
          const data = await res.json();
          setModels(data.models);
          if (data.models.length > 0) {
            setSelectedModel(data.models[0]);
          }
        }
      } catch {
        // Provider fetch failed — models will remain empty
      } finally {
        setModelsLoading(false);
      }
    }
    fetchModels();
    fetchDocuments();
  }, [fetchDocuments]);

  // Auto scroll chat to bottom
  useEffect(() => {
    if (messageListRef.current) {
      const messageList = messageListRef.current;
      messageList.scrollTop = messageList.scrollHeight;
    }
  }, [messages]);

  // Focus on input field
  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.focus();
    }
  }, []);

  // Handle errors
  const handleError = (errorMessage?: string) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        role: "assistant",
        content: errorMessage || "Oops! There seems to be an error. Please try again.",
      },
    ]);
    setLoading(false);
    setUserInput("");
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (userInput.trim() === "" || !selectedModel) {
      return;
    }

    setLoading(true);
    const context: Message[] = [
      ...messages,
      { role: "user", content: userInput },
    ];
    setMessages(context);

    // Reset user input
    setUserInput("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: context,
          provider: selectedModel.provider,
          model: selectedModel.id,
          useDocuments: useDocuments && documents.length > 0,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMsg =
          response.status === 429
            ? "Too many requests. Please wait a moment and try again."
            : errorData?.error || "Something went wrong. Please try again.";
        handleError(errorMsg);
        return;
      }

      const data = await response.json();

      if (!data?.result?.content) {
        handleError();
        return;
      }

      setMessages((prevMessages) => [
        ...prevMessages,
        { role: "assistant", content: data.result.content },
      ]);
    } catch {
      handleError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  // Prevent blank submissions and allow for multiline input
  const handleEnter = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && userInput) {
      if (!e.shiftKey && userInput) {
        handleSubmit(e);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
    }
  };

  // Binary file extensions that must be uploaded to the server for parsing
  const BINARY_EXTENSIONS = new Set(["pdf", "docx"]);

  // Handle file selection — read text files client-side, store binary files for server upload
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDocName(file.name);

    const ext = file.name.toLowerCase().split(".").pop() || "";

    if (BINARY_EXTENSIONS.has(ext)) {
      // Binary file — store for server-side upload
      setPendingFile(file);
      setDocContent(`[${ext.toUpperCase()} file: ${file.name} — ${Math.round(file.size / 1024)}KB]`);
    } else {
      // Text file — read client-side
      setPendingFile(null);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result;
        if (typeof text === "string") {
          setDocContent(text);
        }
      };
      reader.readAsText(file);
    }

    // Reset file input so the same file can be selected again
    e.target.value = "";
  };

  // Upload document — uses multipart for binary files, JSON for pasted text
  const handleUploadDocument = async () => {
    if (!docName.trim() || (!docContent.trim() && !pendingFile)) return;

    setUploading(true);
    try {
      let res: Response;

      if (pendingFile) {
        // Binary file — send as multipart form data for server-side parsing
        const formData = new FormData();
        formData.append("file", pendingFile);
        formData.append("name", docName.trim());

        res = await fetch("/api/documents", {
          method: "POST",
          body: formData,
        });
      } else {
        // Text paste — send as JSON
        res = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: docName.trim(), content: docContent }),
        });
      }

      if (res.ok) {
        setDocName("");
        setDocContent("");
        setPendingFile(null);
        fetchDocuments();
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.error || "Failed to upload document");
      }
    } catch {
      alert("Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  // Delete document
  const handleDeleteDocument = async (id: string) => {
    try {
      const res = await fetch("/api/documents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        fetchDocuments();
      }
    } catch {
      // silently fail
    }
  };

  // Group models by provider for the dropdown
  const providerLabels: Record<string, string> = {
    openai: "OpenAI",
    anthropic: "Anthropic",
    gemini: "Google",
    ollama: "Ollama",
  };

  const groupedModels = models.reduce<Record<string, ModelOption[]>>(
    (groups, model) => {
      const key = model.provider;
      if (!groups[key]) groups[key] = [];
      groups[key].push(model);
      return groups;
    },
    {},
  );

  return (
    <>
      <Head>
        <title>Chat UI</title>
        <meta name="description" content="Multi-model AI chat interface — GPT-5.2, Claude, Gemini, Ollama" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.topnav}>
        <div className={styles.navlogo}>
          <Link href="/">Chat UI</Link>
        </div>
        <div className={styles.navlinks}>
          <button
            className={`${styles.docstoggle} ${docsOpen ? styles.docstoggleactive : ""}`}
            onClick={() => setDocsOpen(!docsOpen)}
            title="Document memory"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            {documents.length > 0 && (
              <span className={styles.docsbadge}>{documents.length}</span>
            )}
          </button>
          {documents.length > 0 && (
            <label className={styles.usedocslabel} title="Include document context in AI responses">
              <input
                type="checkbox"
                checked={useDocuments}
                onChange={(e) => setUseDocuments(e.target.checked)}
                className={styles.usedocscheckbox}
              />
              <span className={styles.usedocstext}>Use docs</span>
            </label>
          )}
          {modelsLoading ? (
            <span className={styles.modelloading}>Loading models...</span>
          ) : models.length === 0 ? (
            <span className={styles.modelloading}>No providers configured</span>
          ) : (
            <select
              className={styles.modelselect}
              value={selectedModel ? `${selectedModel.provider}:${selectedModel.id}` : ""}
              onChange={(e) => {
                const [provider, ...idParts] = e.target.value.split(":");
                const id = idParts.join(":");
                const model = models.find(
                  (m) => m.provider === provider && m.id === id,
                );
                if (model) setSelectedModel(model);
              }}
              disabled={loading}
            >
              {Object.entries(groupedModels).map(([provider, providerModels]) => (
                <optgroup key={provider} label={providerLabels[provider] || provider}>
                  {providerModels.map((model) => (
                    <option key={`${model.provider}:${model.id}`} value={`${model.provider}:${model.id}`}>
                      {model.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Document panel */}
      {docsOpen && (
        <div className={styles.docspanel}>
          <div className={styles.docspanelheader}>
            <h3>Document Memory</h3>
            <button
              className={styles.docspanelclose}
              onClick={() => setDocsOpen(false)}
            >
              &times;
            </button>
          </div>
          <p className={styles.docspaneldesc}>
            Upload documents (PDF, DOCX, or text files) to give the AI context from your files. Toggle &quot;Use docs&quot; to include relevant excerpts in your conversations.
          </p>

          {/* Upload section */}
          <div className={styles.docsupload}>
            <div className={styles.docsuploadrow}>
              <input
                type="text"
                placeholder="Document name..."
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                className={styles.docnameinput}
                maxLength={200}
              />
              <button
                className={styles.docsfilebutton}
                onClick={() => fileInputRef.current?.click()}
              >
                Choose file
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.md,.csv,.json,.xml,.html,.log,.js,.ts,.jsx,.tsx,.py,.java,.c,.cpp,.h,.hpp,.go,.rs,.yaml,.yml,.toml,.ini,.cfg,.conf,.sh,.bat,.sql,.r,.rb,.php,.swift,.kt"
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />
            </div>
            <textarea
              placeholder="Paste document content here, or choose a file above..."
              value={docContent}
              onChange={(e) => {
                setDocContent(e.target.value);
                if (pendingFile) setPendingFile(null);
              }}
              readOnly={!!pendingFile}
              className={styles.doccontenttextarea}
              rows={4}
            />
            <button
              className={styles.docsuploadbutton}
              onClick={handleUploadDocument}
              disabled={uploading || !docName.trim() || (!docContent.trim() && !pendingFile)}
            >
              {uploading ? "Processing..." : pendingFile ? "Upload & Extract Text" : "Upload Document"}
            </button>
          </div>

          {/* Document list */}
          <div className={styles.docslist}>
            {documents.length === 0 ? (
              <p className={styles.docsempty}>No documents uploaded yet.</p>
            ) : (
              documents.map((doc) => (
                <div key={doc.id} className={styles.docsitem}>
                  <div className={styles.docsiteminfo}>
                    <span className={styles.docsitemname}>{doc.name}</span>
                    <span className={styles.docsitemmeta}>
                      {doc.chunkCount} chunks &middot; {Math.round(doc.charCount / 1000)}KB
                    </span>
                  </div>
                  <button
                    className={styles.docsdeletebutton}
                    onClick={() => handleDeleteDocument(doc.id)}
                    title="Remove document"
                  >
                    &times;
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <main className={styles.main}>
        <div className={styles.cloud}>
          <div ref={messageListRef} className={styles.messagelist}>
            {messages.map((message, index) => (
              <div
                key={index}
                className={
                  message.role === "user" &&
                  loading &&
                  index === messages.length - 1
                    ? styles.usermessagewaiting
                    : message.role === "assistant"
                      ? styles.apimessage
                      : styles.usermessage
                }
              >
                {message.role === "assistant" ? (
                  <Image
                    src="/openai.png"
                    alt="AI"
                    width="30"
                    height="30"
                    className={styles.boticon}
                    priority={true}
                  />
                ) : (
                  <Image
                    src="/usericon.png"
                    alt="Me"
                    width="30"
                    height="30"
                    className={styles.usericon}
                    priority={true}
                  />
                )}
                <div className={styles.markdownanswer}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.center}>
          <div className={styles.cloudform}>
            <form onSubmit={handleSubmit}>
              {useDocuments && documents.length > 0 && (
                <div className={styles.docsactiveindicator}>
                  Using {documents.length} document{documents.length !== 1 ? "s" : ""} for context
                </div>
              )}
              <textarea
                disabled={loading || models.length === 0}
                onKeyDown={handleEnter}
                ref={textAreaRef}
                autoFocus={false}
                rows={1}
                maxLength={512}
                id="userInput"
                name="userInput"
                placeholder={
                  models.length === 0
                    ? "No AI providers configured..."
                    : loading
                      ? "Waiting for response..."
                      : "Type your question..."
                }
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                className={styles.textarea}
              />
              <button
                type="submit"
                disabled={loading || models.length === 0}
                className={styles.generatebutton}
              >
                {loading ? (
                  <div className={styles.loadingwheel}>
                    <CircularProgress color="inherit" size={20} />
                  </div>
                ) : (
                  <svg
                    viewBox="0 0 20 20"
                    className={styles.svgicon}
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
                  </svg>
                )}
              </button>
            </form>
          </div>
          <div className={styles.footer}>
            <p>
              Powered by{" "}
              <a href="https://openai.com/" target="_blank" rel="noopener noreferrer">OpenAI</a>,{" "}
              <a href="https://anthropic.com/" target="_blank" rel="noopener noreferrer">Anthropic</a>,{" "}
              <a href="https://ai.google.dev/" target="_blank" rel="noopener noreferrer">Google</a>
              {" & "}
              <a href="https://ollama.com/" target="_blank" rel="noopener noreferrer">Ollama</a>.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}

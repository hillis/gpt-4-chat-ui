import { useState, useRef, useEffect, FormEvent, KeyboardEvent } from "react";
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

export default function Home() {
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi there! How can I help?" },
  ]);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelOption | null>(null);
  const [modelsLoading, setModelsLoading] = useState(true);

  const messageListRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

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
  }, []);

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
        <meta name="description" content="Multi-model AI chat interface" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.topnav}>
        <div className={styles.navlogo}>
          <Link href="/">Chat UI</Link>
        </div>
        <div className={styles.navlinks}>
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

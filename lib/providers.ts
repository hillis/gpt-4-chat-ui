import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";

// --- Shared types ---

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
}

export interface ProviderConfig {
  provider: string;
  models: ModelOption[];
  chat(model: string, messages: ChatMessage[]): Promise<string>;
}

// --- OpenAI ---

function createOpenAIProvider(): ProviderConfig | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const client = new OpenAI({ apiKey });

  return {
    provider: "openai",
    models: [
      { id: "gpt-4o", name: "GPT-4o", provider: "openai" },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "openai" },
      { id: "gpt-4.1", name: "GPT-4.1", provider: "openai" },
      { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", provider: "openai" },
      { id: "gpt-4.1-nano", name: "GPT-4.1 Nano", provider: "openai" },
      { id: "o3-mini", name: "o3-mini", provider: "openai" },
    ],
    async chat(model: string, messages: ChatMessage[]): Promise<string> {
      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          ...messages,
        ],
        temperature: 0,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) throw new Error("No response from OpenAI");
      return content;
    },
  };
}

// --- Anthropic (Claude) ---

function createAnthropicProvider(): ProviderConfig | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const client = new Anthropic({ apiKey });

  return {
    provider: "anthropic",
    models: [
      { id: "claude-sonnet-4-5-20250929", name: "Claude Sonnet 4.5", provider: "anthropic" },
      { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", provider: "anthropic" },
      { id: "claude-opus-4-6", name: "Claude Opus 4.6", provider: "anthropic" },
    ],
    async chat(model: string, messages: ChatMessage[]): Promise<string> {
      const response = await client.messages.create({
        model,
        max_tokens: 4096,
        system: "You are a helpful assistant.",
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      const block = response.content[0];
      if (!block || block.type !== "text") {
        throw new Error("No response from Anthropic");
      }
      return block.text;
    },
  };
}

// --- Google Gemini ---

function createGeminiProvider(): ProviderConfig | null {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return null;

  const client = new GoogleGenAI({ apiKey });

  return {
    provider: "gemini",
    models: [
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "gemini" },
      { id: "gemini-2.5-pro-preview-05-06", name: "Gemini 2.5 Pro", provider: "gemini" },
      { id: "gemini-2.5-flash-preview-05-20", name: "Gemini 2.5 Flash", provider: "gemini" },
    ],
    async chat(model: string, messages: ChatMessage[]): Promise<string> {
      // Convert to Gemini's content format
      const contents = messages.map((m) => ({
        role: m.role === "assistant" ? ("model" as const) : ("user" as const),
        parts: [{ text: m.content }],
      }));

      const response = await client.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: "You are a helpful assistant.",
        },
      });

      const text = response.text;
      if (!text) throw new Error("No response from Gemini");
      return text;
    },
  };
}

// --- Ollama (local models) ---

function createOllamaProvider(): ProviderConfig | null {
  const baseUrl = process.env.OLLAMA_BASE_URL;
  if (!baseUrl) return null;

  // Default models — users can run any model they've pulled into Ollama
  const defaultModels = (process.env.OLLAMA_MODELS || "llama3.3,mistral,phi4")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);

  return {
    provider: "ollama",
    models: defaultModels.map((m) => ({
      id: m,
      name: `${m} (local)`,
      provider: "ollama",
    })),
    async chat(model: string, messages: ChatMessage[]): Promise<string> {
      const url = `${baseUrl.replace(/\/+$/, "")}/api/chat`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: "You are a helpful assistant." },
            ...messages,
          ],
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama returned ${response.status}`);
      }

      const data = await response.json();
      const content = data?.message?.content;
      if (!content) throw new Error("No response from Ollama");
      return content;
    },
  };
}

// --- Provider registry ---

const providerFactories = [
  createOpenAIProvider,
  createAnthropicProvider,
  createGeminiProvider,
  createOllamaProvider,
];

let cachedProviders: ProviderConfig[] | null = null;

export function getProviders(): ProviderConfig[] {
  if (!cachedProviders) {
    cachedProviders = providerFactories
      .map((factory) => factory())
      .filter((p): p is ProviderConfig => p !== null);
  }
  return cachedProviders;
}

export function getAvailableModels(): ModelOption[] {
  return getProviders().flatMap((p) => p.models);
}

export function findProvider(
  providerName: string,
): ProviderConfig | undefined {
  return getProviders().find((p) => p.provider === providerName);
}
